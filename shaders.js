let vertexShaderSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;

    void main(){
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
        }
    `

let renderFragmentShaderSource=`#version 300 es
    precision highp float;

    uniform sampler2D u_texture;
    in vec2 v_texCoord;
    out vec4 fragColor;

    void main(){
        fragColor = texture(u_texture, v_texCoord);
    }
`

let getMovementIntentionsFS=`#version 300 es
    precision highp float;

    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform int preyMovementRadius;
    uniform int predatorMovementRadius;
    uniform float time;

    in vec2 v_texCoord;
    out vec4 fragColor;

    float rand(vec2 co){
        co = vec2(1.0, 1.0) - co;
        float a = 12.9898;
        float b = 78.233;
        float c = 43758.5453;
        float dt= dot(co.xy ,vec2(a,b));
        float sn= mod(dt,3.14);
        return fract(sin(sn) * c);
    }

    vec4 quadrantCounts(vec2 pos){
        vec4 counts = vec4 (0.0, 0.0, 0.0, 0.0);
        int radius;
        vec4 stateCount;

        vec2 texelSize = 1.0 / u_resolution;
        float dx = texelSize.x;
        float dy = texelSize.y;

        vec4 cell = texture(u_texture, pos);

        if(cell.b == 1.0){
            radius = preyMovementRadius;
            stateCount = vec4 (1.0, 0.0, 0.0, 1.0);
        }
        else if(cell.r == 1.0){
            radius = predatorMovementRadius;
            stateCount = vec4 (0.0, 0.0, 1.0, 1.0);
        }
        
        for (int i = -radius; i <= radius; i++){
            for (int j = -radius; j <= radius; j++){

                vec2 offset = pos - vec2(float(i) * dx, float(j) * dy);
                float x = offset.x;
                float y = offset.y;
                if (x < 0.0 || x > 1.0 || y < 0.0 || y > 1.0){
                    continue;
                }

                vec4 neighbor = texture(u_texture, offset);
                if (neighbor == stateCount){
                    if (x < pos.x){
                        counts.r += 1.0;
                    }
                    if (x > pos.x){
                        counts.g += 1.0;
                    }
                    if (y < pos.y){
                        counts.b += 1.0;
                    }
                    if (y > pos.y){
                        counts.a += 1.0;
                    }
                }
            }
        }
        return counts;
    }

    vec2 targetCell(vec2 pos){
        if (texture(u_texture, pos) == vec4 (0.0, 0.0, 0.0, 1.0)){
            return vec2(0.0, 0.0);
        }
        vec4 counts;
        vec2 texelSize = 1.0 / u_resolution;
        float dx = texelSize.x;
        float dy = texelSize.y;

        vec4 cell = texture(u_texture, pos);

        counts = quadrantCounts(pos);
        
        counts += vec4(0.001, 0.001, 0.001, 0.001);
        int indices[4] = int[4](0, 1, 2, 3);

        for (int i = 0; i < 4; i++) {
            int j = int(rand(pos + vec2(float(i), time)) * 4.0);
            int tempInd = indices[i];
            indices[i] = indices[j];
            indices[j] = tempInd;
        }

        vec2 directions[4] = vec2[4](
            vec2(-dx, 0.0), 
            vec2(dx, 0.0),
            vec2(0.0, -dy), 
            vec2(0.0, dy)
        );

        float total = counts.r + counts.g + counts.b + counts.a;
        total *= rand(pos + vec2(time, time));

        for (int j = 0; j < 4; j++){
            int i = indices[j];
            total -= counts[i];
            if (total < 0.0){
                vec2 result = directions[i];
                if (cell.r != 1.0){
                    result *= -1.0;
                }
                vec2 intent = pos + result;
                vec4 temp = texture(u_texture, intent);
                if (temp.r == 1.0 || temp.b == 1.0 || intent.x < 0.0 || intent.x > 1.0 || intent.y < 0.0 || intent.y > 1.0){
                    continue;
                }
                else{
                    return result;
                }
            }
        }
        return vec2(0.0, 0.0);
    }

    void main() {
        vec4 cell = texture(u_texture, v_texCoord);
        vec2 intentions = targetCell(v_texCoord);

        float entity = 0.0;
        if (cell.r == 1.0){
            entity = 1.0;
        }
        else if (cell.b == 1.0){
            entity = 0.5;
        }
        fragColor = vec4 (entity, intentions, 1.0);
    }
`

let checkMovementFS = `#version 300 es
    precision highp float;

    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform float time;

    in vec2 v_texCoord;
    out vec4 fragColor;

    float rand(vec2 co){
        co = vec2(1.0, 1.0) - co;
        float a = 12.9898;
        float b = 78.233;
        float c = 43758.5453;
        float dt= dot(co.xy ,vec2(a,b));
        float sn= mod(dt,3.14);
        return fract(sin(sn) * c);
    }

    vec2 emptyCell(vec2 pos){
        vec2 texelSize = 1.0 / u_resolution;
        float dx = texelSize.x;
        float dy = texelSize.y;

        vec4 cell = texture(u_texture, pos);
        vec2 directions[4] = vec2[4](vec2(-dx, 0.0), vec2(dx, 0.0), vec2(0.0, dy), vec2(0.0, -dy));
        float choice[4] = float[4](0.0, 0.0, 0.0, 0.0);
        float total = 0.0;

        for (int i = 0; i < 4; i++) {
            int j = int(rand(pos + vec2(float(i), time)) * 4.0);
            vec2 tempDir = directions[i];
            directions[i] = directions[j];
            directions[j] = tempDir;
        }

        for (int i = 0; i < 4; i++){
            vec4 temp = texture(u_texture, pos + directions[i]);
            vec2 dir = vec2 (temp.g, temp.b);
            if (dir == -directions[i]){
                choice[i] = 1.0;
                total += 1.0;
            }
        }
        
        total *= rand(pos + vec2(time, time));
        for (int i = 0; i < 4; i++){
            total -= choice[i];
            if (total < 0.0){
                return directions[i];
            }
        }

        return vec2 (0.0, 0.0);
    }

    void main(){
        vec4 cell = texture(u_texture, v_texCoord);

        if (cell.r == 0.0){
            vec2 dir = emptyCell(v_texCoord);
            fragColor = vec4(0.0, dir.x, dir.y, 1.0);
            return;
        }

        else{
            fragColor = cell;
            return;
        }
        fragColor = vec4 (0.5, 0.5, 0.5, 1.0);
    }
`

let applyMovementFS = `#version 300 es
    precision highp float;

    uniform sampler2D u_texture;
    uniform vec2 u_resolution;

    in vec2 v_texCoord;
    out vec4 fragColor;

    float emptyCell(vec2 pos){
        vec4 cell = texture(u_texture, pos);
        vec2 target = pos + vec2(cell.g, cell.b);
        cell = texture(u_texture, target);
        return cell.r;
    }
    
    void main(){
        vec4 cell = texture(u_texture, v_texCoord);

        if (cell == vec4 (0.5, 0.5, 0.5, 1.0)){
            fragColor = vec4 (0.5, 0.5, 0.5, 1.0);
            return;
        }
        
        if (cell.r == 0.0){
            float entity = emptyCell(v_texCoord);
            if (entity == 1.0){
                fragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
            else if (entity == 0.5){
                fragColor = vec4(0.0, 0.0, 1.0, 1.0);
            }
            else{
                fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
            return;
        }
        
        if (cell.r == 1.0){
            vec2 dir = vec2(cell.g, cell.b);
            if (dir == vec2(0.0, 0.0)){
                fragColor = vec4 (1.0, 0.0, 0.0, 1.0);
                return;
            }
            vec4 target = texture(u_texture, v_texCoord + dir);
            if (vec2(target.g, target.b) == -dir){
                fragColor = vec4 (0.0, 0.0, 0.0, 1.0);
            }
            else{
                fragColor = vec4 (1.0, 0.0, 0.0, 1.0);
            }
            return;
        }
        
        if (cell.r == 0.5){
            vec2 dir = vec2(cell.g, cell.b);
            if (dir == vec2(0.0, 0.0)){
                fragColor = vec4 (0.0, 0.0, 1.0, 1.0);
                return;
            }
            vec4 target = texture(u_texture, v_texCoord + dir);
            if (vec2(target.g, target.b) == -dir){
                fragColor = vec4 (0.0, 0.0, 0.0, 1.0);
            }
            else{
                fragColor = vec4 (0.0, 0.0, 1.0, 1.0);
            }
            return;
        }
        fragColor = vec4 (0.5, 0.5, 0.5, 1.0);
    }
`

let interactionsFS = `#version 300 es
    precision highp float;

    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform float preyBirthRate;
    uniform float predatorKillRate;
    uniform float predatorBirthRate;
    uniform float predatorDeathRate;
    uniform float preyNaturalDeathRate;
    uniform float predatorDeathMultiplier;
    uniform float time;

    in vec2 v_texCoord;
    out vec4 fragColor;

    float rand(vec2 co){
        co = vec2(1.0, 1.0) - co;
        float a = 12.9898;
        float b = 78.233;
        float c = 43758.5453;
        float dt= dot(co.xy ,vec2(a,b));
        float sn= mod(dt,3.14);
        return fract(sin(sn) * c);
    }

    ivec2 moore(vec2 pos, int radius){
        int prey_nearby = 0;
        int predators_nearby = 0;

        vec2 texelSize = 1.0 / u_resolution;
        float dx = texelSize.x;
        float dy = texelSize.y;

        vec4 cell = texture(u_texture, pos);

        for (int i = -radius; i <= radius; i++){
            for (int j = -radius; j <= radius; j++){
                vec2 offset = pos - vec2(float(i) * dx, float(j) * dy);
                if (offset.x < 0.0 || offset.x > 1.0 || offset.y < 0.0 || offset.y > 1.0){
                    continue;
                }
                else{
                    vec4 neighbor = texture(u_texture, offset);
                    prey_nearby += int(neighbor.b);
                    predators_nearby += int(neighbor.r);
                }
            }
        }
        return ivec2 (prey_nearby, predators_nearby);
    }
    
    void main(){
        fragColor = texture(u_texture, v_texCoord);
        float prob1 = rand(v_texCoord + vec2(time, time));
        float prob2 = rand(v_texCoord + vec2(time + 1.0, time + 1.0));
        float prob3 = rand(v_texCoord + vec2(time + 2.0, time + 2.0));
        float prob4 = rand(v_texCoord + vec2(time + 3.0, time + 3.0));
        float prob5 = rand(v_texCoord + vec2(time + 4.0, time + 4.0));
        float prob6 = rand(v_texCoord + vec2(time + 5.0, time + 5.0));
        float prob7 = rand(v_texCoord + vec2(time + 6.0, time + 6.0));

        if (fragColor == vec4(0.0, 0.0, 0.0, 1.0)){
            ivec2 counts = moore(v_texCoord, 2);
            if (counts.y == 0 && counts.x > 0){
                if (prob1 < tanh(preyBirthRate * float(counts.x)) && prob2 > preyNaturalDeathRate){
                    fragColor = vec4 (0.0, 0.0, 1.0, 1.0);
                }
            }
        }
        
        if (fragColor == vec4(0.0, 0.0, 1.0, 1.0)){
            ivec2 counts = moore(v_texCoord, 2);
            if (counts.y > 0){
                if(prob3 < tanh(predatorKillRate * float(counts.y))){
                    if (prob4 < predatorBirthRate){
                        fragColor = vec4 (1.0, 0.0, 0.0, 1.0);
                    }
                    else{
                        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
                    }
                    
                }
                else if(prob5 < preyNaturalDeathRate){
                    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
                }
            }
            else if(prob6 < preyNaturalDeathRate){
                fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        }

        if (fragColor == vec4(1.0, 0.0, 0.0, 1.0)){
            ivec2 counts = moore(v_texCoord, 2);
            
            if (counts.x > 0 && prob7 < predatorDeathRate){
                fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
            
            else if(counts.x == 0 && prob7 < predatorDeathRate * predatorDeathMultiplier){
                fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        }   
    }
`