// instancing
ivb_vertex_buffer_delete(vbuffer);
ivb_instance_buffer_delete(instbuff);
vertex_format_delete(format);
buffer_delete(instbuffer_raw);

// no instancing
vertex_delete_buffer(vbuffer_no_instancing);
vertex_format_delete(format_no_instancing);

