_gl = undefined;
_glInstExt = undefined;

_vertexBuffers = new Array(256);
_vertexBufferVertNum = new Array(256).fill(0);
_vertexBufferFormats = new Array(256);

_instanceBuffers = new Array(256);
_instanceBufferInstNum = new Array(256).fill(0);
_instanceBufferInstDataSizes = new Array(256).fill(0);

function __ivb_init() {
	_gl = canvas.getContext('webgl');
	_glInstExt = _gl.getExtension('ANGLE_instanced_arrays');
	
	if (!_glInstExt) {
		console.error('vertex buffer instancing is not supported');
		return false;
	}
	
	console.log('----- vertex buffer instancing is initialized -----');
	return true;
}

function __ivb_free() {
	for(let i=0; i<_vertexBuffers.length; i++) {
		__ivb_vertex_buffer_delete(i);
	}
	
	for(let i=0; i<_instanceBuffers.length; i++) {
		__ivb_instance_buffer_delete(i);
	}
}

function __ivb_vertex_buffer_create(srcBufferAddr, vertexFormatInfo, vertNum) {
	const bufferIndex = _vertexBuffers.findIndex(element => element === undefined);
	if(bufferIndex===-1) {
		bufferIndex = _vertexBuffers.length;
		_vertexBuffers.push(undefined);
		_vertexBufferVertNum.push(0);
		_vertexBufferFormats.push(undefined);
	}
	
	const data = Module.HEAPU8.subarray(srcBufferAddr, srcBufferAddr + vertNum * vertexFormatInfo.vert_size);
	
	const vertexBuffer = _gl.createBuffer();
	_gl.bindBuffer(_gl.ARRAY_BUFFER, vertexBuffer);
	_gl.bufferData(_gl.ARRAY_BUFFER, data, _gl.STATIC_DRAW);
	_gl.bindBuffer(_gl.ARRAY_BUFFER, null);
	
	_vertexBuffers[ bufferIndex ] = vertexBuffer;
	_vertexBufferVertNum[ bufferIndex ] = vertNum;
	_vertexBufferFormats[ bufferIndex ] = vertexFormatInfo;
	return bufferIndex;
}

function __ivb_vertex_buffer_delete(bufferIndex) {
	const vertexBuffer = _vertexBuffers[ bufferIndex ];
	if(vertexBuffer===undefined) {
		return;
	}
	_gl.deleteBuffer(vertexBuffer);
	
	_vertexBuffers[ bufferIndex ] = undefined;
	_vertexBufferVertNum[ bufferIndex ] = 0;
	_vertexBufferFormats[ bufferIndex ] = undefined;
}

const attribCache = {
	program: null,
	vertAttrLoc: [],
	instAttrLoc: []
};

function __ivb_vertex_buffer_submit(vbufferIndex, primtype, ibufferIndex, instNum) {
	const vertexBuffer = _vertexBuffers[ vbufferIndex ];
	if(vertexBuffer===undefined) {
		console.error("Attempt to use a non-existent instanced vertex buffer.");
		return;
	}
	
	const vertNum = _vertexBufferVertNum[ vbufferIndex ];
	const format = _vertexBufferFormats[ vbufferIndex ];
	
	const instanceBuffer = _instanceBuffers[ ibufferIndex ];
	if(instanceBuffer===undefined) {
		console.error("Attempt to use a non-existent instance buffer.");
		return;
	}
	
	const instanceDataSize = _instanceBufferInstDataSizes[ ibufferIndex ];
	
	if(instanceDataSize!=format.inst_size) {
		console.error("The vertex and index buffers are incompatible.");
		return;
	}
	
	const instNumFix = instNum!=-1 ? instNum : _instanceBufferInstNum[ ibufferIndex ];
	
	const vert_elems = format.vert_elems;
	const vert_size = format.vert_size;
	const inst_elems = format.inst_elems;
	const inst_size = format.inst_size;
	
	const program = _gl.getParameter(_gl.CURRENT_PROGRAM);
	
	/*
	// test with simple caching of attribute locations
	if(attribCache.program!==program) {
		const vertAttrLoc = [];
		for(let i=0; i<vert_elems.length; i++) {
			const attr = _gl.getAttribLocation(program, vert_elems[i].name);
			vertAttrLoc.push(attr);
		}
		
		const instAttrLoc = [];
		for(let i=0; i<inst_elems.length; i++) {
			const attr = _gl.getAttribLocation(program, inst_elems[i].name);
			instAttrLoc.push(attr);
		}
		
		attribCache.program = program;
		attribCache.vertAttrLoc = vertAttrLoc;
		attribCache.instAttrLoc = instAttrLoc;
	}
	
	const vertAttrLoc = attribCache.vertAttrLoc;
	const instAttrLoc = attribCache.instAttrLoc;
	*/
	
	// bind vertex buffer
	_gl.bindBuffer(_gl.ARRAY_BUFFER, vertexBuffer);
	for(let i=0; i<vert_elems.length; i++) {
		const elem = vert_elems[i];
		//const attr = vertAttrLoc[i]; // cached
		const attr = _gl.getAttribLocation(program, elem.name);
		_gl.enableVertexAttribArray(attr);
		_gl.vertexAttribPointer(attr, elem.elem_num, elem.type, elem.norm, vert_size, elem.offset);
	}
	
	// bind instance buffer
	_gl.bindBuffer(_gl.ARRAY_BUFFER, instanceBuffer);
	for(let i=0; i<inst_elems.length; i++) {
		const elem = inst_elems[i];
		//const attr = instAttrLoc[i]; // cached
		const attr = _gl.getAttribLocation(program, elem.name);
		_gl.enableVertexAttribArray(attr);
		_gl.vertexAttribPointer(attr, elem.elem_num, elem.type, elem.norm, inst_size, elem.offset);
		_glInstExt.vertexAttribDivisorANGLE(attr, 1);
	}
	
	// draw
	_glInstExt.drawArraysInstancedANGLE(primtype, 0, vertNum, instNumFix);
	
	for(let i=0; i<inst_elems.length; i++) {
		//const attr = instAttrLoc[i]; // cached
		const attr = _gl.getAttribLocation(program, inst_elems[i].name);
		_glInstExt.vertexAttribDivisorANGLE(attr, 0);
	}
	
	_gl.bindBuffer(_gl.ARRAY_BUFFER, null);
}

function __ivb_vertex_buffer_get_vert_data_size(bufferIndex) {
	const format = _vertexBufferFormats[ bufferIndex ];
	return format!=undefined ? format.vert_size : 0;
}

function __ivb_vertex_buffer_get_inst_data_size(bufferIndex) {
	const format = _vertexBufferFormats[ bufferIndex ];
	return format!=undefined ? format.inst_size : 0;
}

function __ivb_instance_buffer_create(srcBufferAddr, instanceDataSize, instanceNum) {
	const bufferIndex = _instanceBuffers.findIndex(element => element === undefined);
	if(bufferIndex===-1) {
		bufferIndex = _instanceBuffers.length;
		_instanceBuffers.push(undefined);
		_instanceBufferInstNum.push(0);
		_instanceBufferInstDataSizes.push(0);
	}
	
	const instanceBuffer = _gl.createBuffer();
	_gl.bindBuffer(_gl.ARRAY_BUFFER, instanceBuffer);
	if(srcBufferAddr!=-1) {
		const data = Module.HEAPU8.subarray(srcBufferAddr, srcBufferAddr + instanceDataSize * instanceNum);
		_gl.bufferData(_gl.ARRAY_BUFFER, data, _gl.DYNAMIC_DRAW);
	} else {
		_gl.bufferData(_gl.ARRAY_BUFFER, instanceDataSize * instanceNum, _gl.DYNAMIC_DRAW);
	}
	_gl.bindBuffer(_gl.ARRAY_BUFFER, null);
	
	_instanceBuffers[ bufferIndex ] = instanceBuffer;
	_instanceBufferInstNum[ bufferIndex ] = instanceNum;
	_instanceBufferInstDataSizes[ bufferIndex ] = instanceDataSize;
	return bufferIndex;
}

function __ivb_instance_buffer_update(bufferIndex, destOffset, srcBufferAddr, srcBufferSize) {
	const instanceBuffer = _instanceBuffers[ bufferIndex ];
	if(instanceBuffer===undefined) {
		console.error("Attempt to update a non-existent instance buffer.");
		return;
	}
	
	const availableSize = _instanceBufferInstNum[ instanceBuffer ] * _instanceBufferInstDataSizes[ instanceBuffer ];
	if(destOffset < 0 || destOffset + srcBufferSize > availableSize) {
		console.error("Attempt to update an invalid range of instance buffer.");
		return;
	}
	
	const data = Module.HEAPU8.subarray(srcBufferAddr, srcBufferAddr + srcBufferSize);
	
	_gl.bindBuffer(_gl.ARRAY_BUFFER, instanceBuffer);
	_gl.bufferSubData(_gl.ARRAY_BUFFER, destOffset, data);
	_gl.bindBuffer(_gl.ARRAY_BUFFER, null);
}

function __ivb_instance_buffer_delete(bufferIndex) {
	const instanceBuffer = _instanceBuffers[ bufferIndex ];
	if(instanceBuffer===undefined) {
		return;
	}
	
	_gl.deleteBuffer(instanceBuffer);
	_instanceBuffers[ bufferIndex ] = undefined;
	_instanceBufferInstNum[ bufferIndex ] = 0;
	_instanceBufferInstDataSizes[ bufferIndex ] = 0;
}

function __ivb_instance_buffer_get_inst_data_size(bufferIndex) {
	const size = _instanceBufferInstDataSizes[ bufferIndex ];
	return size!==undefined ? size : 0;
}

