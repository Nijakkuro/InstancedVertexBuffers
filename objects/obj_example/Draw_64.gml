draw_set_alpha(0.7);
draw_set_color(c_black);
draw_rectangle(0, 0, 512, 144, false);
draw_set_alpha(1);

draw_set_color(c_white);
draw_set_font(fa_left);
draw_set_halign(fa_top);
draw_text(8,   8, ivb_supported ? "instancing is supported" : "instancing is not supported");
draw_text(8,  28, $"use_instancing = {use_instancing} (tap or press space to switch)");
draw_text(8,  48, $"time_instancing = {to_ms_str(time_instancing)} ms");
draw_text(8,  68, $"time_no_instancing = {to_ms_str(time_no_instancing)} ms");
draw_text(8,  88, $"instnum = {instnum}");
draw_text(8, 108, $"fps = {fps}");

