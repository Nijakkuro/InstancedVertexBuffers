// vertex data:
attribute vec3 in_Position;
attribute vec2 in_TextureCoord;

// instance data:
attribute vec3 in_TextureCoord2; // local position offset
attribute vec4 in_Colour;        // color

// varying
varying vec2 v_vTexcoord;
varying vec4 v_vColour;

void main()
{
	vec3 local_pos = in_Position + in_TextureCoord2;
	vec4 object_space_pos = vec4( local_pos.x, local_pos.y, local_pos.z, 1.0);
	gl_Position = gm_Matrices[MATRIX_WORLD_VIEW_PROJECTION] * object_space_pos;
	
	v_vColour = in_Colour;
	v_vTexcoord = in_TextureCoord;
}

