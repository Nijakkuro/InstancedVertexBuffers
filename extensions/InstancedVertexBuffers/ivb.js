var _webgl = undefined;
var _webglInstExt = undefined;

var _vertexBuffers = new Array(256);
var _vertexBufferVertNum = new Array(256).fill(0);
var _vertexBufferFormats = new Array(256);

var _instanceBuffers = new Array(256);
var _instanceBufferInstNum = new Array(256).fill(0);
var _instanceBufferInstDataSizes = new Array(256).fill(0);

function __ivb_init() {
	_webgl = canvas.getContext('webgl');
	_webglInstExt = _webgl.getExtension('ANGLE_instanced_arrays');
	
	if (!_webglInstExt) {
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

function __ivb_vertex_buffer_create(srcArrayBuffer, srcBufferAddr, vertexFormatInfo, vertNum) {
	const bufferIndex = _vertexBuffers.findIndex(element => element === undefined);
	if(bufferIndex===-1) {
		bufferIndex = _vertexBuffers.length;
		_vertexBuffers.push(undefined);
		_vertexBufferVertNum.push(0);
		_vertexBufferFormats.push(undefined);
	}
	
	if(typeof vertexFormatInfo === 'string') {
		vertexFormatInfo = JSON.parse(vertexFormatInfo);
	}
	
	const buffer = srcArrayBuffer!==undefined ? new Uint8Array(srcArrayBuffer) : Module.HEAPU8;
	const data = buffer.subarray(srcBufferAddr, srcBufferAddr + vertNum * vertexFormatInfo.vert_size);
	
	const vertexBuffer = _webgl.createBuffer();
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, vertexBuffer);
	_webgl.bufferData(_webgl.ARRAY_BUFFER, data, _webgl.STATIC_DRAW);
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, null);
	
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
	_webgl.deleteBuffer(vertexBuffer);
	
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
	
	const program = _webgl.getParameter(_webgl.CURRENT_PROGRAM);
	
	/*
	// test with simple caching of attribute locations
	if(attribCache.program!==program) {
		const vertAttrLoc = [];
		for(let i=0; i<vert_elems.length; i++) {
			const attr = _webgl.getAttribLocation(program, vert_elems[i].name);
			vertAttrLoc.push(attr);
		}
		
		const instAttrLoc = [];
		for(let i=0; i<inst_elems.length; i++) {
			const attr = _webgl.getAttribLocation(program, inst_elems[i].name);
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
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, vertexBuffer);
	for(let i=0; i<vert_elems.length; i++) {
		const elem = vert_elems[i];
		//const attr = vertAttrLoc[i]; // cached
		const attr = _webgl.getAttribLocation(program, elem.name);
		_webgl.enableVertexAttribArray(attr);
		_webgl.vertexAttribPointer(attr, elem.elem_num, elem.type, elem.norm, vert_size, elem.offset);
	}
	
	// bind instance buffer
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, instanceBuffer);
	for(let i=0; i<inst_elems.length; i++) {
		const elem = inst_elems[i];
		//const attr = instAttrLoc[i]; // cached
		const attr = _webgl.getAttribLocation(program, elem.name);
		_webgl.enableVertexAttribArray(attr);
		_webgl.vertexAttribPointer(attr, elem.elem_num, elem.type, elem.norm, inst_size, elem.offset);
		_webglInstExt.vertexAttribDivisorANGLE(attr, 1);
	}
	
	// draw
	_webglInstExt.drawArraysInstancedANGLE(primtype, 0, vertNum, instNumFix);
	
	for(let i=0; i<inst_elems.length; i++) {
		//const attr = instAttrLoc[i]; // cached
		const attr = _webgl.getAttribLocation(program, inst_elems[i].name);
		_webglInstExt.vertexAttribDivisorANGLE(attr, 0);
	}
	
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, null);
}

function __ivb_vertex_buffer_get_vert_data_size(bufferIndex) {
	const format = _vertexBufferFormats[ bufferIndex ];
	return format!=undefined ? format.vert_size : 0;
}

function __ivb_vertex_buffer_get_inst_data_size(bufferIndex) {
	const format = _vertexBufferFormats[ bufferIndex ];
	return format!=undefined ? format.inst_size : 0;
}

function __ivb_instance_buffer_create(srcArrayBuffer, srcBufferAddr, instanceDataSize, instanceNum) {
	const bufferIndex = _instanceBuffers.findIndex(element => element === undefined);
	if(bufferIndex===-1) {
		bufferIndex = _instanceBuffers.length;
		_instanceBuffers.push(undefined);
		_instanceBufferInstNum.push(0);
		_instanceBufferInstDataSizes.push(0);
	}
	
	const instanceBuffer = _webgl.createBuffer();
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, instanceBuffer);
	if(srcBufferAddr!=-1) {
		const buffer = srcArrayBuffer!==undefined ? new Uint8Array(srcArrayBuffer) : Module.HEAPU8;
		const data = buffer.subarray(srcBufferAddr, srcBufferAddr + instanceDataSize * instanceNum);
		_webgl.bufferData(_webgl.ARRAY_BUFFER, data, _webgl.DYNAMIC_DRAW);
	} else {
		_webgl.bufferData(_webgl.ARRAY_BUFFER, instanceDataSize * instanceNum, _webgl.DYNAMIC_DRAW);
	}
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, null);
	
	_instanceBuffers[ bufferIndex ] = instanceBuffer;
	_instanceBufferInstNum[ bufferIndex ] = instanceNum;
	_instanceBufferInstDataSizes[ bufferIndex ] = instanceDataSize;
	return bufferIndex;
}

function __ivb_instance_buffer_update(bufferIndex, destOffset, srcArrayBuffer, srcBufferAddr, srcBufferSize) {
	const instanceBuffer = _instanceBuffers[ bufferIndex ];
	if(instanceBuffer===undefined) {
		console.error("Attempt to update a non-existent instance buffer.");
		return;
	}
	
	const availableSize = _instanceBufferInstNum[ bufferIndex ] * _instanceBufferInstDataSizes[ bufferIndex ];
	if(destOffset < 0 || destOffset + srcBufferSize > availableSize) {
		console.error("Attempt to update an invalid range of instance buffer.");
		return;
	}
	
	const buffer = srcArrayBuffer!==undefined ? new Uint8Array(srcArrayBuffer) : Module.HEAPU8;
	const data = buffer.subarray(srcBufferAddr, srcBufferAddr + srcBufferSize);
	
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, instanceBuffer);
	_webgl.bufferSubData(_webgl.ARRAY_BUFFER, destOffset, data);
	_webgl.bindBuffer(_webgl.ARRAY_BUFFER, null);
}

function __ivb_instance_buffer_delete(bufferIndex) {
	const instanceBuffer = _instanceBuffers[ bufferIndex ];
	if(instanceBuffer===undefined) {
		return;
	}
	
	_webgl.deleteBuffer(instanceBuffer);
	_instanceBuffers[ bufferIndex ] = undefined;
	_instanceBufferInstNum[ bufferIndex ] = 0;
	_instanceBufferInstDataSizes[ bufferIndex ] = 0;
}

function __ivb_instance_buffer_get_inst_data_size(bufferIndex) {
	const size = _instanceBufferInstDataSizes[ bufferIndex ];
	return size!==undefined ? size : 0;
}

