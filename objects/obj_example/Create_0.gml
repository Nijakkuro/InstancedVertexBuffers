
// vertex format
vertex_format_begin();

// vertex data
vertex_format_add_position_3d();
vertex_format_add_texcoord();

// instance data
vertex_format_add_custom(vertex_type_float3, vertex_usage_texcoord); // instance position offset
vertex_format_add_colour(); // instance color

format = vertex_format_end();


// vertex buffer
var add_vertex = function(buffer, vx, vy, vz, tx, ty) {
	buffer_write(buffer, buffer_f32, vx);
	buffer_write(buffer, buffer_f32, vy);
	buffer_write(buffer, buffer_f32, vz);
	buffer_write(buffer, buffer_f32, tx);
	buffer_write(buffer, buffer_f32, ty);
}

var vbuffer_raw = buffer_create(256, buffer_grow, 1);
var sz = 16;
add_vertex(vbuffer_raw, -sz, -sz, 0,  0, 0);
add_vertex(vbuffer_raw,  sz, -sz, 0,  1, 0);
add_vertex(vbuffer_raw,  sz,  sz, 0,  1, 1);

add_vertex(vbuffer_raw, -sz, -sz, 0,  0, 0);
add_vertex(vbuffer_raw,  sz,  sz, 0,  1, 1);
add_vertex(vbuffer_raw, -sz,  sz, 0,  0, 1);

vbuffer = ivb_vertex_buffer_create(vbuffer_raw, format, 2, 0, 6);
buffer_delete(vbuffer_raw);


// instance buffer

instnum = 1000;
instbuffer_raw = buffer_create(4 * 4 * instnum, buffer_grow, 1);

instances = array_create(instnum);
for(var i=0; i<instnum; i++) {
	var ix = random_range(0, room_width);
	var iy = random_range(0, room_height);
	
	var dx = choose(-1, 1) * random_range(0.5, 3);
	var dy = choose(-1, 1) * random_range(0.5, 3);
	
	var color = choose(
		#FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF,
		#7F0000, #7F7F00, #007F00, #007F7F, #00007F, #7F007F
	);
	
	var alpha = 1;
	
	instances[i] = {
		x: ix,
		y: iy,
		dx,
		dy,
		color,
		alpha,
		
		r: color_get_red(color)/255,
		g: color_get_green(color)/255,
		b: color_get_blue(color)/255,
		argb: (clamp(round(alpha * 255), 0, 255) << 24) | color,
	}
}

add_instance_data = function(inst) {
	var buffer = instbuffer_raw;
	buffer_write(buffer, buffer_f32, inst.x);
	buffer_write(buffer, buffer_f32, inst.y);
	buffer_write(buffer, buffer_f32, 0);
	buffer_write(buffer, buffer_u32, inst.argb);
}

array_foreach(instances, add_instance_data);

instbuff = ivb_instance_buffer_create(instbuffer_raw, format, 2, 0, instnum);


// texture and shader
texture = sprite_get_texture(spr_texture, 0);
shader = sh_example;


// no instancing

vertex_format_begin();
vertex_format_add_position_3d();
vertex_format_add_texcoord();
format_no_instancing = vertex_format_end();

var vbuff = vertex_create_buffer();
vertex_begin(vbuff, format_no_instancing);
vertex_position_3d(vbuff, -sz, -sz, 0); vertex_texcoord(vbuff, 0, 0);
vertex_position_3d(vbuff,  sz, -sz, 0); vertex_texcoord(vbuff, 1, 0);
vertex_position_3d(vbuff,  sz,  sz, 0); vertex_texcoord(vbuff, 1, 1);
vertex_position_3d(vbuff, -sz, -sz, 0); vertex_texcoord(vbuff, 0, 0);
vertex_position_3d(vbuff,  sz,  sz, 0); vertex_texcoord(vbuff, 1, 1);
vertex_position_3d(vbuff, -sz,  sz, 0); vertex_texcoord(vbuff, 0, 1);
vertex_end(vbuff);
vertex_freeze(vbuff);
vbuffer_no_instancing = vbuff;

shader_no_instancing = sh_example_no_instancing;
shader_no_instancing_pos_unif = shader_get_uniform(shader_no_instancing, "u_Offset");
shader_no_instancing_col_unif = shader_get_uniform(shader_no_instancing, "u_Colour");

draw_instance = function(inst) {
	shader_set_uniform_f(shader_no_instancing_pos_unif, inst.x, inst.y, 0);
	shader_set_uniform_f(shader_no_instancing_col_unif, inst.r, inst.g, inst.b, inst.alpha);
	vertex_submit(vbuffer_no_instancing, pr_trianglelist, texture);
}


// 
use_instancing = ivb_supported;
time_instancing = 0;
time_no_instancing = 0;

to_ms_str = function(value) {
	return string_format(value * 0.001, 4, 6);
}

