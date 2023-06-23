class Chart {
    constructor(container, samples, options, onClick = null) {
        this.samples = samples;

        this.axesLabels = options.axesLabels;
        this.styles = options.styles;
        this.icon = options.icon;
        this.onClick = onClick;

        this.canvas = document.createElement('canvas');
        this.canvas.width = options.size;
        this.canvas.height = options.size;
        this.canvas.style = 'background-color: white;'
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');

        this.margin = options.size * 0.1;
        this.transparency = options.transparency || 1;

        this.dataTrans = {
            offset: [0, 0],
            scale: 1
        }
        this.dragInfo = {
            start: [0, 0],
            end: [0, 0],
            offset: [0, 0],
            dragging: false
        }

        this.pixelBounds = this.#getPixelBounds();
        this.dataBounds = this.#getDataBounds();
        this.defaultDataBounds = this.#getDataBounds();

        this.hoverdSample = null;
        this.seletedSample = null;

        this.#draw();
        this.#addEventListeners();
    }

    #addEventListeners = () => {
        const { canvas, dataTrans, dragInfo } = this;

        canvas.addEventListener('mousedown', (e) => {
            const dataLoc = this.#getMouse(e, true);
            dragInfo.start = dataLoc;
            dragInfo.dragging = true;
            dragInfo.end = [0, 0];
            dragInfo.offset = [0, 0];
        })

        canvas.addEventListener('mousemove', (e) => {
            if (dragInfo.dragging) {
                const dataLoc = this.#getMouse(e, true);
                dragInfo.end = dataLoc;
                dragInfo.offset = math.scale(math.subtract(dragInfo.start, dragInfo.end), dataTrans.scale ** 2);
                const newOffset = math.add(dataTrans.offset, dragInfo.offset);
                this.#updateDataBounds(newOffset, dataTrans.scale);
            }

            const pLoc = this.#getMouse(e);
            const pPoints = this.samples.map(s => math.remapPoint(this.dataBounds, this.pixelBounds, s.point));
            const index = math.getNearest(pLoc, pPoints);
            const nearest = this.samples[index];
            const distance = math.distance(pPoints[index], pLoc);
            if (distance < this.margin / 2) this.hoverdSample = nearest;
            else this.hoverdSample = null;

            this.#draw();
        })

        canvas.addEventListener('mouseup', (e) => {
            dataTrans.offset = math.add(dataTrans.offset, dragInfo.offset);
            dragInfo.dragging = false;
        })

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const dir = Math.sign(e.deltaY);
            const step = 0.02;
            dataTrans.scale += dir * step;
            dataTrans.scale = Math.max(step, Math.min(2, dataTrans.scale));

            this.#updateDataBounds(dataTrans.offset, dataTrans.scale);

            this.#draw();
        })

        canvas.addEventListener('click', (e) => {
            if (!math.equals(dragInfo.offset, [0, 0])) return;

            if (this.hoverdSample) {
                if (this.seletedSample === this.hoverdSample) {
                    this.seletedSample = null;
                } else {
                    this.seletedSample = this.hoverdSample;
                }
            } else {
                this.seletedSample = null;
            }

            if (this.onClick) {
                this.onClick(this.seletedSample);
            }
            this.#draw();
        })
    }

    selectSample = (sample) => {
        this.seletedSample = sample;
        this.#draw();
    }

    #updateDataBounds = (offset, scale) => {
        const { dataBounds, defaultDataBounds } = this;
        dataBounds.left = defaultDataBounds.left + offset[0];
        dataBounds.right = defaultDataBounds.right + offset[0];
        dataBounds.top = defaultDataBounds.top + offset[1];
        dataBounds.bottom = defaultDataBounds.bottom + offset[1];

        const center = [
            (dataBounds.left + dataBounds.right) / 2,
            (dataBounds.top + dataBounds.bottom) / 2,
        ]

        dataBounds.left = math.lerp(center[0], dataBounds.left, scale ** 2);
        dataBounds.right = math.lerp(center[0], dataBounds.right, scale ** 2);
        dataBounds.top = math.lerp(center[1], dataBounds.top, scale ** 2);
        dataBounds.bottom = math.lerp(center[1], dataBounds.bottom, scale ** 2);
    }

    #getMouse = (e, dataSpace = false) => {
        const rect = this.canvas.getBoundingClientRect();
        const pixelLoc = [
            e.clientX - rect.left,
            e.clientY - rect.top
        ]

        if (dataSpace) {
            const dataLoc = math.remapPoint(this.pixelBounds, this.defaultDataBounds, pixelLoc);
            return dataLoc;
        }

        return pixelLoc;
    }

    #getPixelBounds = () => {
        const { canvas, margin } = this;
        const bounds = {
            left: margin,
            right: canvas.width - margin,
            top: margin,
            bottom: canvas.height - margin
        }

        return bounds;
    }

    #getDataBounds = () => {
        const { samples } = this;
        const x = samples.map(s => s.point[0]);
        const y = samples.map(s => s.point[1]);
        const minX = Math.min(...x);
        const maxX = Math.max(...x);
        const minY = Math.min(...y);
        const maxY = Math.max(...y);

        const bounds = {
            left: minX,
            right: maxX,
            top: maxY,
            bottom: minY
        }

        return bounds;
    }

    #draw = () => {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.globalAlpha = this.transparency;
        this.#drawSamples(this.samples);
        ctx.globalAlpha = 1;

        if (this.hoverdSample) {
            this.#emphasizeSample(this.hoverdSample);
        }

        if (this.seletedSample) {
            this.#emphasizeSample(this.seletedSample, 'yellow');
        }

        this.#drawAxes();
    }

    #emphasizeSample = (sample, color = 'white') => {
        const pLoc = math.remapPoint(this.dataBounds, this.pixelBounds, sample.point);
        const grd = this.ctx.createRadialGradient(...pLoc, 0, ...pLoc, this.margin);
        grd.addColorStop(0, color);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        graphics.drawPoint(this.ctx, pLoc, grd, this.margin * 2);
        this.#drawSamples([sample]);
    }

    #drawAxes = () => {
        const { ctx, canvas, axesLabels, margin } = this;
        const { left, right, top, bottom } = this.pixelBounds;

        ctx.clearRect(0, 0, canvas.width, margin);
        ctx.clearRect(0, 0, margin, canvas.height);
        ctx.clearRect(0, canvas.height - margin, canvas.width, canvas.height);
        ctx.clearRect(canvas.width - margin, 0, canvas.width, canvas.height);

        graphics.drawText(ctx, {
            text: axesLabels[0],
            loc: [canvas.width / 2, bottom + margin / 2],
            size: margin * 0.6
        })

        ctx.save()
        ctx.translate(left - margin / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        graphics.drawText(ctx, {
            text: axesLabels[1],
            loc: [0, 0],
            size: margin * 0.6
        })
        ctx.restore();

        ctx.beginPath()
        ctx.moveTo(left, top);
        ctx.lineTo(left, bottom);
        ctx.lineTo(right, bottom);
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'lightgray';
        ctx.stroke();
        ctx.setLineDash([]);

        const minData = math.remapPoint(this.pixelBounds, this.dataBounds, [left, bottom]);
        graphics.drawText(ctx, {
            text: math.formatedNumber(minData[0], 2),
            loc: [left, bottom],
            size: margin * 0.3,
            align: 'left',
            vAlign: 'top'
        })

        ctx.save();
        ctx.translate(left, bottom);
        ctx.rotate(-Math.PI / 2);
        graphics.drawText(ctx, {
            text: math.formatedNumber(minData[1], 2),
            loc: [0, 0],
            size: margin * 0.3,
            align: 'left',
            vAlign: 'bottom'
        })
        ctx.restore();

        const maxData = math.remapPoint(this.pixelBounds, this.dataBounds, [right, top]);
        graphics.drawText(ctx, {
            text: math.formatedNumber(maxData[0], 2),
            loc: [right, bottom],
            size: margin * 0.3,
            align: 'right',
            vAlign: 'top'
        })

        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(-Math.PI / 2);
        graphics.drawText(ctx, {
            text: math.formatedNumber(maxData[1], 2),
            loc: [0, 0],
            size: margin * 0.3,
            align: 'right',
            vAlign: 'bottom'
        })
        ctx.restore();
    }

    #drawSamples = (samples) => {
        const { ctx, pixelBounds, dataBounds, icon, styles } = this;
        for (const sample of samples) {
            const { point, label } = sample;

            const pixelLoc = math.remapPoint(dataBounds, pixelBounds, point)

            switch (icon) {
                case 'image':
                    graphics.drawImage(ctx, styles[label].image, pixelLoc);
                    break;
                case 'text':
                    graphics.drawText(ctx, {
                        text: styles[label].text,
                        loc: pixelLoc,
                        size: 20
                    });
                    break;
                default:
                    graphics.drawPoint(ctx, pixelLoc, styles[label].color);
            }

        }
    }
}