onload = () => {
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth - 15
    canvas.height = window.innerHeight - 50
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    Setup(ctx, newGrid(ctx, 10), [])
}


// БЕРЕМ КООРДИНАТЫ
function getMouseCoords(elem, data) {
    const {x, y} = elem.getBoundingClientRect()
    return [data.clientX - x, data.clientY - y]
}


// ОБНОВЛЯЕМ
function Setup(ctx, grid, cloud) {
    let val = 2.5
    let radius = 5
    canvas.onclick = (data) => {
        const [x, y] = getMouseCoords(canvas, data)
        grid.applyInfluence(x, y, grid.cellSide * radius)
        cloud.push({x, y})
        Draw(ctx, grid, cloud, val)
    }
    const l_slider = document.getElementById('lim')
    const l_val = document.getElementById('lim_val')
    l_slider.value = val
    l_val.innerHTML = `${l_val.value}`
    val = parseFloat(l_val.value)
    l_slider.onchange = () => {
        l_val.innerHTML = `${l_slider.value}`
        val = parseFloat(l_slider.value)
        Draw(ctx, grid, cloud, val)
    }
    const r_slider = document.getElementById('radius')
    const r_val = document.getElementById('rad_val')
    r_slider.value = radius
    r_val.innerHTML = `${r_slider.value}`
    radius = parseFloat(r_slider.value)
    r_slider.onchange = () => {
        r_val.innerHTML = `${r_slider.value}`
        radius = parseFloat(r_slider.value)
        Draw(ctx, grid, cloud, val, radius)
    }
}


// РИСУЕМ
function Draw(ctx, grid, cloud, val, radius) {
    if (radius !== undefined) {
        grid.clearGrid()
        for (const point of cloud) {
            grid.applyInfluence(point.x, point.y, grid.cellSide*radius)
        }
    }
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    for (let numX = 0; numX < grid.ncols; numX++) {
        for (let numY = 0; numY < grid.nrows; numY++) {
            const {x, y, value} = grid.getNode(numX, numY)
            const color = Math.min(Math.floor((value / 4)*255), 255)
            ctx.fillStyle = `rgb(${color},${color},${color})`
            ctx.fillRect(x-1, y-1, 3, 3)
        }
    }
    ctx.fillStyle = 'white'
    for (const point of cloud) {ctx.fillRect(point.x-3, point.y-3, 7, 7)}

    const segments = []
    for (let numX = 0; numX < grid.ncols - 1; numX++) {
        for (let numY = 0; numY < grid.nrows - 1; numY++) {
            const cellPoints = [
                grid.getNode(numX, numY), 
                grid.getNode(numX+1, numY), 
                grid.getNode(numX+1, numY+1), 
                grid.getNode(numX, numY+1), 
            ]
            for (const s of getSegments(cellPoints, val)) {segments.push(s)}
        }
    }
    ctx.strokeStyle = 'white'
    for (const s of segments) {
        ctx.beginPath()
        ctx.moveTo(s[0].x, s[0].y)
        ctx.lineTo(s[1].x, s[1].y)
        ctx.stroke()
    }
}

function newGrid(ctx, cellSide) {
    const ncols = Math.ceil(ctx.canvas.width / cellSide) + 1
    const nrows = Math.ceil(ctx.canvas.height / cellSide) + 1
    const nodeValues = []
    for (let x = 0; x < ncols; x++) {
        for (let y = 0; y < nrows; y++) {nodeValues.push(0)}
    }
    const getIndex = (numX, numY) => numX*nrows + numY

    return {
        cellSide,
        nodeValues,
        ncols,
        nrows,
        getNode: (numX, numY) => {
            if (numX < 0 || numX >= ncols) {throw `wrong numX: ${numX}`}
            if (numY < 0 || numY >= nrows) {throw `wrong numY: ${numY}`}
            const x = numX*cellSide
            const y = numY*cellSide
            return {x, y, value: nodeValues[getIndex(numX, numY)]}
        },
        applyInfluence: (pX, pY, r, f) => {
            if (f === undefined) {
                const rr = r*r
                f = (dd) => {
                    if (rr >= dd) {return (rr - dd) / rr}
                    return 0
                }
            }
            const minX = Math.floor((pX - r)/cellSide)
            const minY = Math.floor((pY - r)/cellSide)
            const maxX = Math.ceil((pX + r)/cellSide)
            const maxY = Math.ceil((pY + r)/cellSide)
            for (let numX = minX; numX <= maxX; numX++) {
                for (let numY = minY; numY <= maxY; numY++) {
                    const x = numX*cellSide
                    const y = numY*cellSide
                    const dx = pX - x
                    const dy = pY - y
                    const dd = dx*dx + dy*dy
                    nodeValues[getIndex(numX, numY)] += f(dd)
                }
            }
        },
        clearGrid: () => {
            for (let i = 0; i < nodeValues.length; i++) {nodeValues[i] = 0}
        }
    }
}

const SEGMENT_TABLE = [
[],    
[[0, 3]],    
[[0, 1]],    
[[1, 3]],
[[1, 2]],    
[[0, 3], [1, 2]],    
[[0, 2]],    
[[3, 2]],    
[[2, 3]],    
[[2, 0]],    
[[0, 1], [2, 3]],    
[[2, 1]],    
[[3, 1]],    
[[1, 0]],
[[3, 0]],    
[]]

const SEGMENT_TO_VERTICES = [[0, 1], [1, 2], [2, 3], [3, 0]]

function getSegments(p, val) {
    let index = 0;
    if (p[0].value > val) {index |= 1}
    if (p[1].value > val) {index |= 2}
    if (p[2].value > val) {index |= 4}
    if (p[3].value > val) {index |= 8}
    const getMidpoint = (i, j) => {
        const vi = Math.abs(p[i].value - val)
        const vj = Math.abs(p[j].value - val)
        return vi / (vi + vj)
    }
    const answer = []
    for (const segment of SEGMENT_TABLE[index]) {
        const [side1, side2] = segment
        const [i11, i12] = SEGMENT_TO_VERTICES[side1]
        const [i21, i22] = SEGMENT_TO_VERTICES[side2]
        const m1 = getMidpoint(i11, i12)
        const m2 = getMidpoint(i21, i22)
        const v11 = p[i11]
        const v12 = p[i12]
        const v21 = p[i21]
        const v22 = p[i22]
        answer.push([
            {x: v11.x * (1-m1) + v12.x * m1,
             y: v11.y * (1-m1) + v12.y * m1,},
            {x: v21.x * (1-m2) + v22.x * m2,
             y: v21.y * (1-m2) + v22.y * m2,},
        ])
    }
    return answer
}
