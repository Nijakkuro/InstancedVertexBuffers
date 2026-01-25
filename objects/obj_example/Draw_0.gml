gpu_set_blendmode(bm_add);

if(use_instancing) {
	shader_set(shader);
	var time = get_timer();
	ivb_vertex_buffer_submit(vbuffer, pr_trianglelist, texture, instbuff, instnum);
	time_instancing += get_timer() - time;
	shader_reset();
} else {
	shader_set(shader_no_instancing);
	var time = get_timer();
	array_foreach(instances, draw_instance);
	time_no_instancing += get_timer() - time;
	shader_reset();
}

gpu_set_blendmode(bm_normal);

