///_ivb_init()
#define _ivb_init
global.__ivb_supported = os_type==os_operagx || os_browser!=browser_not_a_browser;
if(!global.__ivb_supported) {
	return;
}

if(!__ivb_init()) {
	global.__ivb_supported = false;
	return;
}

var gl_FLOAT = 5126;
var gl_UNSIGNED_BYTE = 5121;
var elems = [
	{ gl_type: gl_FLOAT,         num: 1, size: 4, norm: false }, // vertex_type_float1
	{ gl_type: gl_FLOAT,         num: 2, size: 4, norm: false }, // vertex_type_float2
	{ gl_type: gl_FLOAT,         num: 3, size: 4, norm: false }, // vertex_type_float3
	{ gl_type: gl_FLOAT,         num: 4, size: 4, norm: false }, // vertex_type_float4
	{ gl_type: gl_UNSIGNED_BYTE, num: 4, size: 1, norm: true  }, // vertex_type_colour
	{ gl_type: gl_UNSIGNED_BYTE, num: 4, size: 1, norm: false }  // vertex_type_ubyte4
];

global.__ivb_vert_data_to_elems_info = ds_map_create();
ds_map_add(global.__ivb_vert_data_to_elems_info, vertex_type_float1, elems[0]);
ds_map_add(global.__ivb_vert_data_to_elems_info, vertex_type_float2, elems[1]);
ds_map_add(global.__ivb_vert_data_to_elems_info, vertex_type_float3, elems[2]);
ds_map_add(global.__ivb_vert_data_to_elems_info, vertex_type_float4, elems[3]);
ds_map_add(global.__ivb_vert_data_to_elems_info, vertex_type_colour, elems[4]);
ds_map_add(global.__ivb_vert_data_to_elems_info, vertex_type_ubyte4, elems[5]);

global.__ivb_vert_usage_to_attrib_name = ds_map_create();
ds_map_add(global.__ivb_vert_usage_to_attrib_name, vertex_usage_position, "in_Position");
ds_map_add(global.__ivb_vert_usage_to_attrib_name, vertex_usage_colour,   "in_Colour");
ds_map_add(global.__ivb_vert_usage_to_attrib_name, vertex_usage_normal,   "in_Normal");
ds_map_add(global.__ivb_vert_usage_to_attrib_name, vertex_usage_texcoord, "in_TextureCoord");

global.__ivb_gm_prim_to_gl_prim = [
	undefined,
	0, // 1 - pr_pointlist
	1, // 2 - pr_linelist
	3, // 3 - pr_linestrip
	4, // 4 - pr_trianglelist
	5, // 5 - pr_trianglestrip
	6, // 6 - pr_trianglefan
];

///_ivb_free()
#define _ivb_free
if(global.__ivb_supported) {
	__ivb_free();
	ds_map_destroy(global.__ivb_vert_data_to_elems_info);
	ds_map_destroy(global.__ivb_vert_usage_to_attrib_name);
}

///_ivb_make_detailed_format_info(format, instance_attrib_num)
#define _ivb_make_detailed_format_info
var format_info = vertex_format_get_info(argument[0]);
var instance_attrib_num = argument[1];
var elements = format_info.elements;
var elements_num = array_length(elements);

var attrib_counter = ds_map_create();
var attrib_keys = ds_map_keys_to_array(global.__ivb_vert_usage_to_attrib_name);
var attrib_counter_size = array_length(attrib_keys);
for(var i=0; i<attrib_counter_size; i++) {
	ds_map_add(attrib_counter, attrib_keys[i], 0);
}

var prepared_vertex_elems = [];
var prepared_instance_elems = [];
var vertex_data_size = 0;
var instance_data_size = 0;

for(var i=0; i<elements_num; i++) {
	var element = elements[i];
	
	var elems_info = global.__ivb_vert_data_to_elems_info[? element.type];
	if(elems_info==undefined) {
		show_error("Unsupported vertex data type.", true);
	}
	
	var attrib_name = global.__ivb_vert_usage_to_attrib_name[? element.usage];
	if(attrib_name==undefined) {
		show_error("Unsupported vertex usage type.", true);
	}
	
	var count = attrib_counter[? element.usage];
	if(count>0) {
		attrib_name += string(count+1);
	}
	
	attrib_counter[? element.usage] = count + 1;
	
	var prepared_elem = {
		name:        attrib_name,
		type:        elems_info.gl_type,
		offset:      element.offset,
		size:        element.size,
		elem_size:   elems_info.size,
		elem_num:    elems_info.num,
		norm:        elems_info.norm
	};
	
	var instance_data = (i >= elements_num-instance_attrib_num);
	if(!instance_data) {
		array_push(prepared_vertex_elems, prepared_elem);
		vertex_data_size += prepared_elem.size;
	} else {
		prepared_elem.offset -= vertex_data_size;
		array_push(prepared_instance_elems, prepared_elem);
		instance_data_size += prepared_elem.size;
	}
}

var format_info_prepared = {
	vert_size: vertex_data_size,
	inst_size: instance_data_size,
	vert_elems: prepared_vertex_elems,
	inst_elems: prepared_instance_elems
};

ds_map_destroy(attrib_counter);
return format_info_prepared;

///_ivb_format_get_instance_data_size(format, instance_attrib_num)
#define _ivb_format_get_instance_data_size
var inst_size = 0;
var format_info = vertex_format_get_info(argument[0]);
var elements = format_info.elements;
var elements_num = array_length(elements);
var instance_attrib_num = argument[1];
var instance_attrib_start = elements_num - instance_attrib_num;
for(var i=0; i<instance_attrib_num; i++) {
	inst_size += elements[ instance_attrib_start + i ].size;
}
return inst_size;

///ivb_vertex_buffer_create(buffer, format, instance_attrib_num, src_offset, vert_num)
#define ivb_vertex_buffer_create
if(global.__ivb_supported) {
	var buffer = argument[0];
	var format_info = _ivb_make_detailed_format_info(argument[1], argument[2]);
	var src_offset = max(0, argument[3]);
	var vert_num = argument[4];
	
	var buffer_addr = ( os_browser!=browser_not_a_browser ? 0 : int64(buffer_get_address(buffer)) ) + src_offset;
	var buffer_size = buffer_get_size(buffer) - src_offset;
	
	if(vert_num==-1) {
		vert_num = floor(buffer_size / format_info.vert_size);
	} else if(vert_num<=0) {
		show_error("Invalid vert_num argument.", true);
	}
	
	if(buffer_size < vert_num * format_info.vert_size) {
		show_error("The buffer size is less than required for the specified number of vertices.", true);
	}
	
	var array_buffer = os_browser!=browser_not_a_browser ? buffer_get_address(buffer) : undefined;
	var format_info_fix = os_browser!=browser_not_a_browser ? json_stringify(format_info) : format_info;
	return __ivb_vertex_buffer_create(array_buffer, buffer_addr, format_info_fix, vert_num);
}
return undefined;

///ivb_vertex_buffer_delete(instanced_vbuffer)
#define ivb_vertex_buffer_delete
if(global.__ivb_supported) {
	__ivb_vertex_buffer_delete(argument[0]);
}

///ivb_vertex_buffer_submit(instanced_vbuffer, primtype, texture, instance_buffer, inst_num)
#define ivb_vertex_buffer_submit
if(global.__ivb_supported) {
	texture_set_stage(0, argument[2]);
	var primtype = global.__ivb_gm_prim_to_gl_prim[ argument[1] ];
	__ivb_vertex_buffer_submit(argument[0], primtype, argument[3], argument[4]);
}

///ivb_vertex_buffer_get_vert_data_size(instanced_vbuffer)
if(global.__ivb_supported) {
	return __ivb_vertex_buffer_get_vert_data_size(argument[0]);
}
return 0;

///ivb_vertex_buffer_get_inst_data_size(instanced_vbuffer)
if(global.__ivb_supported) {
	return __ivb_vertex_buffer_get_inst_data_size(argument[0]);
}
return 0;

///ivb_instance_buffer_create(buffer, format, instance_attrib_num, src_offset, inst_num)
#define ivb_instance_buffer_create
if(global.__ivb_supported) {
	var buffer = argument[0];
	var inst_size = _ivb_format_get_instance_data_size(argument[1], argument[2]);
	var src_offset = argument[3];
	var inst_num = argument[4];
	
	var buffer_addr = -1;
	if(buffer!=-1) {
		buffer_addr = ( os_browser!=browser_not_a_browser ? 0 : int64(buffer_get_address(buffer)) ) + src_offset;
	}
	
	if(buffer_addr!=-1) {
		var buffer_size = buffer_get_size(buffer) - src_offset;
		
		if(inst_num==-1) {
			inst_num = floor(buffer_size / inst_size);
		} else if(inst_num <= 0) {
			show_error("Invalid inst_num argument.", true);
		}
		
		if(buffer_size < inst_num * inst_size) {
			show_error("The buffer size is less than required for the specified number of instances.", true);
		}
	} else if(inst_num <= 0) {
		show_error("Buffer not specified, inst_num value is invalid.", true);
	}
	
	var array_buffer = os_browser!=browser_not_a_browser && buffer!=-1 ? buffer_get_address(buffer) : undefined;
	return __ivb_instance_buffer_create(array_buffer, buffer_addr, inst_size, inst_num);
}
return undefined;

///ivb_instance_buffer_update(dest_instbuff, dest_offset, src_buffer, src_offset, src_size)
#define ivb_instance_buffer_update
if(global.__ivb_supported) {
	var buffer = argument[2];
	var src_offset = max(0, argument[3]);
	var src_size = argument[4];
	
	if(src_size!=-1 && src_size<=0) {
		show_error("Invalid src_size value.", true);
	}
	
	var buffer_full_size = buffer_get_size(buffer);
	var buffer_size = src_size!=-1 ? src_size : buffer_full_size - src_offset;
	
	if(src_offset < 0 || src_offset + buffer_size > buffer_full_size) {
		show_error("The specified range is outside the buffer.", true);
	}
	
	var buffer_addr = ( os_browser!=browser_not_a_browser ? 0 : int64(buffer_get_address(buffer)) ) + src_offset;
	var array_buffer = os_browser!=browser_not_a_browser ? buffer_get_address(buffer) : undefined;
	__ivb_instance_buffer_update(argument[0], argument[1], array_buffer, buffer_addr, buffer_size);
}

///ivb_instance_buffer_delete(instance_buffer)
#define ivb_instance_buffer_delete
if(global.__ivb_supported) {
	__ivb_instance_buffer_delete(argument[0]);
}

///ivb_instance_buffer_get_inst_data_size(instance_buffer)
#define ivb_instance_buffer_get_inst_data_size
if(global.__ivb_supported) {
	return __ivb_instance_buffer_get_inst_data_size(argument[0]);
}
return 0;

