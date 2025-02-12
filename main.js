document.addEventListener("DOMContentLoaded", () => {
    let startButton = document.getElementById("start-button")
    let pauseButton = document.getElementById("pause-button")
    let restartButton = document.getElementById("restart-button")

    let gridSizeInput = document.getElementById("gridSize")
    let preyInput = document.getElementById("initialPrey")
    let predatorInput = document.getElementById("initialPredators")
    let preyRateInput = document.getElementById("preyBirthRate")
    let predatorKillRateInput = document.getElementById("predatorKillRate")
    let preyDeathRateInput = document.getElementById("preyNaturalDeathRate")
    let predatorBirthRateInput = document.getElementById("predatorBirthRate")
    let predatorDeathRateInput = document.getElementById("predatorDeathRate")
    let preyRadiusInput = document.getElementById("preyMovementRadius")
    let predatorRadiusInput = document.getElementById("predatorMovementRadius")

    let sim = new Simulation(100, 1000, 1000, 1, 0.05, 1, 1, 0.1, 2, 3)

    startButton.addEventListener("click", (e) => {
        sim.startSimulation()
    })

    pauseButton.addEventListener("click", (e) => {
        sim.pauseSimulation()
    })

    restartButton.addEventListener("click", (e) => {
        let gridSize, initialPrey, initialPredators, preyBirthRate, predatorKillRate, preyDeathRate, predatorBirthRate, predatorDeathRate, preyRadius, predatorRadius
        if(gridSizeInput.value){gridSize = parseInt(gridSizeInput.value)}else{gridSize = sim.size}
        if(preyInput.value){initialPrey = parseInt(preyInput.value)}else{initialPrey = sim.initial_prey}
        if(predatorInput.value){initialPredators = parseInt(predatorInput.value)}else{initialPredators = sim.initial_predators}
        if(preyRateInput.value){preyBirthRate = parseFloat(preyRateInput.value)}else{preyBirthRate = sim.prey_birth_rate}
        if(predatorKillRateInput.value){predatorKillRate = parseFloat(predatorKillRateInput.value)}else{predatorKillRate = sim.predator_kill_rate}
        if(preyDeathRateInput.value){preyDeathRate = parseFloat(preyDeathRateInput.value)}else{preyDeathRate = sim.prey_natural_death_rate}
        if(predatorBirthRateInput.value){predatorBirthRate = parseFloat(predatorBirthRateInput.value)}else{predatorBirthRate = sim.predator_birth_rate}
        if(predatorDeathRateInput.value){predatorDeathRate = parseFloat(predatorDeathRateInput.value)}else{predatorDeathRate = sim.predator_death_rate}
        if(preyRadiusInput.value){preyRadius = parseInt(preyRadiusInput.value)}else{preyRadius = sim.prey_movement_radius}
        if(predatorRadiusInput.value){predatorRadius = parseInt(predatorRadiusInput.value)}else{predatorRadius = sim.predator_movement_radius}
        sim.pauseSimulation()

        time = sim.time
        sim = new Simulation(gridSize, initialPrey, initialPredators, preyBirthRate, predatorKillRate, preyDeathRate, predatorBirthRate, predatorDeathRate, preyRadius, predatorRadius)
        sim.time = time
        sim.startSimulation()
    })
})