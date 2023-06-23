const math = {};

math.lerp = (a, b, t) => {
    return a + (b - a) * t;
}

math.invLerp = (a, b, v) => {
    return (v - a) / (b - a);
}

math.remap = (oldA, oldB, newA, newB, v) => {
    const t = math.invLerp(oldA, oldB, v);
    return math.lerp(newA, newB, t);
}

math.remapPoint = (oldBounds, newBounds, point) => {
    return [
        math.remap(oldBounds.left, oldBounds.right, newBounds.left, newBounds.right, point[0]),
        math.remap(oldBounds.top, oldBounds.bottom, newBounds.top, newBounds.bottom, point[1])
    ]
}

math.add = (p1, p2) => {
    return [
        p1[0] + p2[0],
        p1[1] + p2[1]
    ];
}

math.subtract = (p1, p2) => {
    return [
        p1[0] - p2[0],
        p1[1] - p2[1]
    ];
}

math.scale = (p, scaler) => {
    return [
        p[0] * scaler,
        p[1] * scaler,
    ]
}

math.distance = (p1, p2) => {
    const x = p1[0] - p2[0];
    const y = p1[1] - p2[1];
    const distance = Math.sqrt((x ** 2) + (y ** 2));

    return distance;
}

math.getNearest = (loc, points) => {
    let minDist = Number.MAX_SAFE_INTEGER;
    let nearestIndex = 0;

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const d = math.distance(loc, point);

        if (d < minDist) {
            minDist = d;
            nearestIndex = i;
        }
    }

    return nearestIndex;
}

math.equals = (p1, p2) => {
    return p1[0] === p2[0] && p1[1] === p2[1];
}

math.formatedNumber = (n, dec = 0) => {
    return n.toFixed(dec);
}