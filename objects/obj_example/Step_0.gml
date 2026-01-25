if(keyboard_check_pressed(vk_space) || mouse_check_button_pressed(mb_left)) {
	use_instancing = !use_instancing;
}

if(use_instancing) {
	time_instancing = 0;
} else {
	time_no_instancing = 0;
}

var bx1 = 16;
var by1 = 16;
var bx2 = room_width - 16;
var by2 = room_height - 16;
for(var i=0; i<instnum; i++) {
	var inst = instances[i];
	inst.x += inst.dx;
	inst.y += inst.dy;
	if(inst.x < bx1) { inst.x = bx1; inst.dx = -inst.dx; }
	if(inst.y < by1) { inst.y = by1; inst.dy = -inst.dy; }
	if(inst.x > bx2) { inst.x = bx2; inst.dx = -inst.dx; }
	if(inst.y > by2) { inst.y = by2; inst.dy = -inst.dy; }
}

if(use_instancing) {
	var time = get_timer();
	buffer_seek(instbuffer_raw, buffer_seek_start, 0);
	array_foreach(instances, add_instance_data);
	ivb_instance_buffer_update(instbuff, 0, instbuffer_raw, 0, buffer_tell(instbuffer_raw));
	time_instancing += get_timer() - time;
}

