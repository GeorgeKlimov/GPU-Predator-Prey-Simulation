function initializeWebGL(width, height){
    let container = document.getElementById("simulation-container")
    container.innerHTML = ""
    let canvas = document.createElement("canvas")
    container.appendChild(canvas)
    canvas.style = "width:600px;image-rendering: pixelated;"
    canvas.width = width
    canvas.height = height
    let gl = canvas.getContext("webgl2")
    if(!gl) {
        console.error("WebGL not supported in this browser.")
        return
    }
    if (!gl.getExtension('OES_texture_float_linear'))
        throw new Error('Not found OES_texture_float_linear')
    if (!gl.getExtension('EXT_color_buffer_float'))
        throw new Error('Not found EXT_color_buffer_float')

    gl.clearColor(0.9, 0.9, 0.9, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    console.log("WebGL initialized Successfully.")
    return gl
}

function createShader(gl, type, source){
    let shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader
}

function createProgram(gl, vertexShader, fragmentShader){
    let program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        return program
    }
    else{
        console.log("Program compilation error:", gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null
    }
}

function renderToTexture(gl, program, sourceTex, destTex, framebuffer){
    gl.useProgram(program)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, destTex, 0)
    if (sourceTex) gl.bindTexture(gl.TEXTURE_2D, sourceTex)
    gl.bindVertexArray(vao)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function renderToScreen(gl, program, sourceTex, vao){
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, sourceTex);
    gl.bindVertexArray(vao);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function createBuffer(gl, data){
    let buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
}

function createTexture(gl, grid){
    let width = grid.length
    let height = grid[0].length
    let texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    let textureData = new Float32Array(width * height * 4)
    for (let x = 0; x < width; x++){
        for (let y = 0; y < height; y++){
            let index = (x + width * y) * 4
            if (grid[x][y] == 0){
                textureData[index] = 0
                textureData[index + 1] = 0
                textureData[index + 2] = 0
                textureData[index + 3] = 1
            }
            else if(grid[x][y] == 1){
                textureData[index] = 0
                textureData[index + 1] = 0
                textureData[index + 2] = 1
                textureData[index + 3] = 1
            }
            else if(grid[x][y] == 2){
                textureData[index] = 1
                textureData[index + 1] = 0
                textureData[index + 2] = 0
                textureData[index + 3] = 1
            }
        }
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, textureData)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    return texture
}

function validateTextureData(textureData) {
    for (let i = 0; i < textureData.length; i += 4) {
        if (textureData[i] < 0 || textureData[i] > 1 || 
            textureData[i + 1] < 0 || textureData[i + 1] > 1 || 
            textureData[i + 2] < 0 || textureData[i + 2] > 1 || 
            textureData[i + 3] < 0 || textureData[i + 3] > 1) {
            console.error('Invalid texture data at index', i);
            return false;
        }
    }
    return true;
}