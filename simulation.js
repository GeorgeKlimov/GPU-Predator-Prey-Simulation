class Simulation{
    constructor(size, initial_prey, initial_predators, prey_birth_rate, prey_natural_death_rate, predator_kill_rate, predator_birth_rate, predator_death_rate, predator_death_multiplier, prey_movement_radius, predator_movement_radius){
        this.size = size
        this.grid = Array.from({length: size}, () => Array(size).fill(0))
        this.prey_birth_rate = prey_birth_rate
        this.initial_prey = initial_prey
        this.initial_predators = initial_predators
        this.prey_natural_death_rate = prey_natural_death_rate
        this.predator_kill_rate = predator_kill_rate
        this.predator_birth_rate = predator_birth_rate
        this.predator_death_rate = predator_death_rate
        this.predator_death_multiplier = predator_death_multiplier
        this.prey_movement_radius = prey_movement_radius
        this.predator_movement_radius = predator_movement_radius
        this.populationHistory = [[this.initial_predators, this.initial_prey]]
        this.running = false
        this.simulationInterval = null
        this.populateGrid(initial_prey, initial_predators)
        this.time = 1

        this.gl = initializeWebGL(this.size, this.size)
        this.vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource)
        this.renderFragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, renderFragmentShaderSource)
        this.movementIntentionsFS = createShader(this.gl, this.gl.FRAGMENT_SHADER, getMovementIntentionsFS)
        this.checkMovementFS = createShader(this.gl, this.gl.FRAGMENT_SHADER, checkMovementFS)
        this.applyMovementFS = createShader(this.gl, this.gl.FRAGMENT_SHADER, applyMovementFS)
        this.interactionsFS = createShader(this.gl, this.gl.FRAGMENT_SHADER, interactionsFS)
        
        this.renderProgram = createProgram(this.gl, this.vertexShader, this.renderFragmentShader)
        this.movementIntentionsProgram = createProgram(this.gl, this.vertexShader, this.movementIntentionsFS)
        this.checkMovementProgram = createProgram(this.gl, this.vertexShader, this.checkMovementFS)
        this.applyMovementProgram = createProgram(this.gl, this.vertexShader, this.applyMovementFS)
        this.interactionsProgram = createProgram(this.gl, this.vertexShader, this.interactionsFS)

        this.setupBuffers()
        this.framebuffer = this.gl.createFramebuffer()
        
        this.checkMovementTexture = createTexture(this.gl, Array.from({length: size}, () => Array(size).fill(0)))
        this.applyMovementTexture = createTexture(this.gl, Array.from({length: size}, () => Array(size).fill(0)))
        this.gridTexture = createTexture(this.gl, this.grid)
        this.gridUpdateTexture = createTexture(this.gl, this.grid)

        this.drawGrid()
    }

    setupBuffers() {
        let gl = this.gl
        let positions = [
            -1, -1,  0, 0,
             1, -1,  1, 0,
            -1,  1,  0, 1,
            -1,  1,  0, 1,
             1, -1,  1, 0,
             1,  1,  1, 1
        ]
        this.positionBuffer = createBuffer(gl, positions)

        this.positionLocation = gl.getAttribLocation(this.renderProgram, "a_position")
        this.texCoordLocation = gl.getAttribLocation(this.renderProgram, "a_texCoord")

        gl.enableVertexAttribArray(this.positionLocation)
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 16, 0)
        gl.enableVertexAttribArray(this.texCoordLocation)
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 16, 8)
    }

    shuffleArray(array){
        for (let i = array.length - 1; i >=0; i --){
            let j = Math.floor(Math.random() * (i + 1))
            let temp = array[i]
            array[i] = array[j]
            array[j] = temp
        }
    }

    populateGrid(initial_prey, initial_predators){
        let positions = []
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                positions.push([x, y])
            }
        }
        
        this.shuffleArray(positions)

        for (let i = 0; i < initial_prey; i++) {
            let [x, y] = positions.pop()
            this.grid[x][y] = 1
        }

        for (let i = 0; i < initial_predators; i++) {
            let [x, y] = positions.pop()
            this.grid[x][y] = 2
        }
    }

    checkFramebufferStatus() {
        const gl = this.gl

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        switch (status) {
            case gl.FRAMEBUFFER_COMPLETE:
                console.log('Framebuffer is complete');
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.log('Attachment is not complete');
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.log('No attachments');
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.log('Attachments dont have the same dimensions');
                break;
            case gl.FRAMEBUFFER_UNSUPPORTED:
                console.log('Format combination is not supported');
                break;
            default:
                console.log('Unknown framebuffer status:', status);
        }
    }

    movement(){
        let gl = this.gl

        if (!validateTextureData(this.gridTexture)){
            return
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.bindTexture(gl.TEXTURE_2D, this.checkMovementTexture)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.checkMovementTexture, 0)

        gl.useProgram(this.movementIntentionsProgram)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.gridUpdateTexture)
    
        let u_textureLocation = gl.getUniformLocation(this.movementIntentionsProgram, "u_texture")
        let resolutionLocation = gl.getUniformLocation(this.movementIntentionsProgram, "u_resolution")
        let preyRadiusLocation = gl.getUniformLocation(this.movementIntentionsProgram, "preyMovementRadius")
        let predatorRadiusLocation = gl.getUniformLocation(this.movementIntentionsProgram, "predatorMovementRadius")
        let timeLocation = gl.getUniformLocation(this.movementIntentionsProgram, "time")

        gl.uniform1i(u_textureLocation, 0)
        gl.uniform2f(resolutionLocation, this.size, this.size)
        gl.uniform1i(preyRadiusLocation, this.prey_movement_radius)
        gl.uniform1i(predatorRadiusLocation, this.predator_movement_radius)
        gl.uniform1f(timeLocation, this.time)

        gl.drawArrays(gl.TRIANGLES, 0, 6)
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.applyMovementTexture, 0)

        gl.useProgram(this.checkMovementProgram)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.checkMovementTexture)

        u_textureLocation = gl.getUniformLocation(this.checkMovementProgram, "u_texture")
        resolutionLocation = gl.getUniformLocation(this.checkMovementProgram, "u_resolution")
        timeLocation = gl.getUniformLocation(this.checkMovementProgram, "time")

        gl.uniform1i(u_textureLocation, 0)
        gl.uniform2f(resolutionLocation, this.size, this.size)
        gl.uniform1f(timeLocation, this.time)

        gl.drawArrays(gl.TRIANGLES, 0, 6)

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.gridTexture, 0)

        gl.useProgram(this.applyMovementProgram)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.applyMovementTexture)

        u_textureLocation = gl.getUniformLocation(this.applyMovementProgram, "u_texture")
        resolutionLocation = gl.getUniformLocation(this.applyMovementProgram, "u_resolution")

        gl.uniform1i(u_textureLocation, 0)
        gl.uniform2f(resolutionLocation, this.size, this.size)

        gl.drawArrays(gl.TRIANGLES, 0, 6)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        this.drawGrid()
    }

    interactions(){
        let gl = this.gl

        if (!validateTextureData(this.gridTexture)){
            return
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.bindTexture(gl.TEXTURE_2D, this.gridUpdateTexture)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.gridUpdateTexture, 0)

        gl.useProgram(this.interactionsProgram)
        
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, this.gridTexture)

        let u_textureLocation = gl.getUniformLocation(this.interactionsProgram, "u_texture")
        let resolutionLocation = gl.getUniformLocation(this.interactionsProgram, "u_resolution")
        let preyBirthRateLocation = gl.getUniformLocation(this.interactionsProgram, "preyBirthRate")
        let predatorKillRateLocation = gl.getUniformLocation(this.interactionsProgram, "predatorKillRate")
        let predatorBirthRateLocation = gl.getUniformLocation(this.interactionsProgram, "predatorBirthRate")
        let predatorDeathRateLocation = gl.getUniformLocation(this.interactionsProgram, "predatorDeathRate")
        let preyNaturalDeathRateLocation = gl.getUniformLocation(this.interactionsProgram, "preyNaturalDeathRate")
        let predatorDeathMultiplierLocation = gl.getUniformLocation(this.interactionsProgram, "predatorDeathMultiplier")
        let timeLocation = gl.getUniformLocation(this.interactionsProgram, "time")

        gl.uniform1i(u_textureLocation, 0)
        gl.uniform2f(resolutionLocation, this.size, this.size)
        gl.uniform1f(preyBirthRateLocation, this.prey_birth_rate)
        gl.uniform1f(predatorKillRateLocation, this.predator_kill_rate)
        gl.uniform1f(predatorBirthRateLocation, this.predator_birth_rate)
        gl.uniform1f(predatorDeathRateLocation, this.predator_death_rate)
        gl.uniform1f(preyNaturalDeathRateLocation, this.prey_natural_death_rate)
        gl.uniform1f(predatorDeathMultiplierLocation, this.predator_death_multiplier)
        gl.uniform1f(timeLocation, this.time)

        gl.drawArrays(gl.TRIANGLES, 0, 6)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    drawGrid(texture=this.gridTexture){
        let gl = this.gl

        gl.clearColor(0.0, 0.0, 0.0, 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.useProgram(this.renderProgram)

        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    drawPopulationGraph(){
        let canvas = document.getElementById('populationCanvas')
        let ctx = canvas.getContext('2d')

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        let margin = 10
        let width = canvas.width - 2 * margin
        let height = canvas.height - 2 * margin
        let maxPopulation = 1.1 * Math.max(...this.populationHistory.map(([pred, prey]) => Math.max(pred, prey)))

        ctx.strokeStyle = "black"
        ctx.beginPath()
        ctx.moveTo(margin, margin)
        ctx.lineTo(margin, canvas.height - margin)
        ctx.lineTo(canvas.width - margin, canvas.height - margin)
        ctx.stroke()

        ctx.strokeStyle = "red"
        ctx.beginPath()
        for (let i = 0; i < this.populationHistory.length; i++){
            let [predatorCount, preyCount] = this.populationHistory[i]
            let x = margin + (i / this.populationHistory.length) * width
            let y = canvas.height - margin - (predatorCount / maxPopulation) * height
            ctx.lineTo(x, y)
        }
        ctx.stroke()

        ctx.strokeStyle = "blue"
        ctx.beginPath()
        for (let i = 0; i < this.populationHistory.length; i++){
            let [predatorCount, preyCount] = this.populationHistory[i]
            let x = margin + (i / this.populationHistory.length) * width
            let y = canvas.height - margin - (preyCount / maxPopulation) * height
            ctx.lineTo(x, y)
        }
        ctx.stroke()
    }

    drawPopulationPhase(){
        let canvas = document.getElementById('phaseCanvas')
        let ctx = canvas.getContext('2d')

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        let margin = 10
        let width = canvas.width - 2 * margin
        let height = canvas.height - 2 * margin
        let maxPredPopulation = 1.1 * Math.max(...this.populationHistory.map(([pred, prey]) => pred))
        let maxPreyPopulation = 1.1 * Math.max(...this.populationHistory.map(([pred, prey]) => prey))

        ctx.strokeStyle = "black"
        ctx.beginPath()
        ctx.moveTo(margin, margin)
        ctx.lineTo(margin, canvas.height - margin)
        ctx.lineTo(canvas.width - margin, canvas.height - margin)
        ctx.lineTo(canvas.width - margin, margin)
        ctx.lineTo(margin, margin)
        ctx.stroke()

        ctx.strokeStyle = "purple"
        ctx.beginPath()
        ctx.moveTo(this.populationHistory[0][0], this.populationHistory[0][1])
        for (let i = 0; i < this.populationHistory.length; i++){
            let [predatorCount, preyCount] = this.populationHistory[i]
            let x = canvas.width - margin - (predatorCount / maxPredPopulation) * width
            let y = canvas.height - margin - (preyCount / maxPreyPopulation) * height
            ctx.lineTo(x, y)
        }
        ctx.stroke()
    }

    updatePopulationHistory(){
        let gl = this.gl
        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;
        const pixels = new Uint8Array(width * height * 4);
          
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          
        let redPixels = 0;
        let bluePixels = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
        
            if (r > 200 && g < 50 && b < 50 && a > 128) {
            redPixels++;
            }
            else if (b > 200 && r < 50 && g < 50 && a > 128) {
            bluePixels++;
            }
        }   
        
        this.populationHistory.push([redPixels, bluePixels])
    }

    lastTime = 0
    updateSimulation(time){
        if (!this.running){
            return
        }
        this.interactions()
        this.movement()
        this.drawGrid()

        this.time = ((this.time + 1) * 1.5) % 1000
        this.lastTime = time

        this.updatePopulationHistory()
        this.drawPopulationGraph()
        this.drawPopulationPhase()

        console.log(this.populationHistory[this.populationHistory.length-1])
    }

    startSimulation(){
        if(this.running){
            return
        }
        this.running = true
        // this.updateSimulation(this.lastTime)
        this.simulationInterval = setInterval(() => {this.updateSimulation()}, 10)
    }

    pauseSimulation(){
        this.running = false
        clearInterval(this.simulationInterval)
        this.simulationInterval = null
    }

    printGrid(){
        console.log(this.grid.map(row => row.join(' ')).join('\n'))
    }
}