
    (function(global) {
        let cacheArr = []

        const concatArr = function(targetArr) {
            let arr
            for (let i = 1; i < arguments.length; i++) {
                arr = arguments[i];
                Array.prototype.push.apply(targetArr, arr);
            }
        }

        class Qtree {
            constructor(bounds, level = 0) {
                this.objects = []
                this.nodes = []
                this.level = level
                this.bounds = bounds
                this.MAX_OBJECTS = 10
                this.MAX_LEVELS = 5
            }

            clear () {
                this.objects.length = 0
                while (this.nodes.length) {
                    let subnode = this.nodes.shift()
                    subnode.clear()
                }
            }

            split () {
                let x = this.bounds.x
                let y = this.bounds.y
                let sWidth = this.bounds.sWidth
                let sHeight = this.bounds.sHeight

                this.nodes.push(
                    new Qtree(new Rect(this.bounds.cX, y, sWidth, sHeight), this.level + 1),
                    new Qtree(new Rect(x, y, sWidth, sHeight), this.level + 1),
                    new Qtree(new Rect(x, this.bounds.cY, sWidth, sHeight), this.level + 1),
                    new Qtree(new Rect(this.bounds.cX, this.bounds.cY, sWidth, sHeight), this.level + 1)
                )
            }

            getIndex (rect, checkIsInner) {
                let onTop       = rect.y + rect.h <=  this.bounds.cY
                let onBottom    = rect.y >= this.bounds.cY
                let onLeft      = rect.x + rect.w <= this.bounds.cX
                let onRight     = rect.x >= this.bounds.cX

                if (checkIsInner &&
                    (Math.abs(rect.cX - this.bounds.cX) + rect.sWidth > this.bounds.sWidth ||
                    Math.abs(rect.cY - this.bounds.cY) + rect.sHeight > this.bounds.sHeight)) {

                    return -1
                }

                if (onTop) {
                    if (onRight) {
                        return 0
                    } else if (onLeft) {
                        return 1
                    }
                } else if (onBottom) {
                    if (onLeft) {
                        return 2
                    } else if (onRight) {
                        return 3
                    }
                }

                return -1
            }

            insert (item) {
                if (this.nodes.length) {
                    let index = this.getIndex(item)
                    if (index !== -1) {
                        this.nodes[index].insert(item)
                        return
                    }
                }
                this.objects.push(item)

                if (!this.nodes.length &&
                    this.objects.length > this.MAX_OBJECTS &&
                    this.level < this.MAX_LEVELS) {

                    this.split()

                    for (let i = this.objects.length - 1; i >= 0; i--) {
                        let index = this.getIndex(this.objects[i]);
                        if (index !== -1) {
                            this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                        }
                    }
                }
            }

            refresh (scope) {
                scope = scope || this

                for (let i = this.objects.length - 1; i >= 0; i--) {
                    let index = this.getIndex(this.objects[i], true)
                    if (index === -1) {
                        if (this !== scope) {
                            scope.insert(this.objects.splice(i, 1)[0]);
                            
                        }
                    } else if (this.nodes.length) {
                        this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                    }
                }

                for (let i = 0, len = this.nodes.length; i < len; i++) {
                    this.nodes[i].refresh(scope);
                }
            }

            retrieve (rect) {
                let result = cacheArr

                if (this.level === 0) result.length = 0;

                concatArr(result, this.objects);

                if (this.nodes.length) {
                    let index = this.getIndex(rect);
                    if (index !== -1) {
                        this.nodes[index].retrieve(rect);
                    } else {
                        let arr = rect.carve(this.bounds.cX, this.bounds.cY);
                        for (let i = arr.length - 1; i >= 0; i--) {
                            index = this.getIndex(arr[i]);
                            this.nodes[index].retrieve(rect);
                        }
                    }
                }

                return result
            }
        }

        class Rect {
            constructor(x, y, width, height, speedArr = [20, 20]) {
                this.speedArr = speedArr
                this.nextSpeedArr = this.speedArr.slice()
                this.resize(width, height)
                this.moveTo(x, y)
            }

            moveTo (x, y) {
                this.x = x
                this.y = y
                this.cX = x + this.sWidth
                this.cY = y + this.sHeight
            }

            resize (width, height) {
                this.w = width
                this.h = height
                this.sWidth = width / 2
                this.sHeight = height / 2
            }

            draw (cxt) {
                cxt.save()
                cxt.beginPath()
                cxt.rect(this.x, this.y, this.w, this.h)
                cxt.closePath()
                cxt.restore()
            }

            run () {
                this.speedArr[0] = this.nextSpeedArr[0]
                this.speedArr[1] = this.nextSpeedArr[1]

                this.moveTo(
                    this.x + this.speedArr[0] * 0.016,
                    this.y + this.speedArr[1] * 0.016
                )
            }

            copy (rect) {
                this.resize(rect.w, rect.h)
                this.moveTo(rect.x, rect.y)
                this.nextSpeedArr[0] = rect.speedArr[0]
                this.nextSpeedArr[1] = rect.speedArr[1]
            }

            init (x, y, w, h, speedArr) {
                this.resize(w, h)
                this.moveTo(x, y)
            }

            collide (rect, isInner) {
                let tRect1 = tempRectArr[0], 
                    tRect2 = tempRectArr[1],
                    thisRect, sWidthSum, sHeightSum, dWidth, dHeight,
                    onHorizontal, onVertical, focusPoint

                if (!isInner) {

                    tRect1.copy(this)
                    tRect2.copy(rect)

                    sWidthSum = tRect1.sWidth + tRect2.sWidth
                    sHeightSum = tRect1.sHeight + tRect2.sHeight
                    dWidth = sWidthSum - Math.abs(tRect1.cX - tRect2.cX)
                    dHeight = sHeightSum - Math.abs(tRect1.cY - tRect2.cY)

                    while (dWidth > 0 && dHeight > 0) {
                        tRect1.run(-16)
                        tRect2.run(-16)
                        dWidth = sWidthSum - Math.abs(tRect1.cX - tRect2.cX)
                        dHeight = sHeightSum - Math.abs(tRect1.cY - tRect2.cY)
                    }

                    onHorizontal = dWidth <= 0
                    onVertical = dHeight <= 0

                    // 改变方向
                    if (onHorizontal) {
                        focusPoint = this.cX > rect.cX ? 1 : -1
                        this.nextSpeedArr[0] = focusPoint * 
                            (Math.abs(this.nextSpeedArr[0]) + Math.abs(rect.speedArr[0])) / 2
                    }

                    if (onVertical) {
                        focusPoint = tRect1.cY > tRect2.cY ? 1 : -1
                        this.nextSpeedArr[1] = focusPoint * 
                            (Math.abs(this.nextSpeedArr[1]) + Math.abs(rect.speedArr[1])) / 2
                    }

                } else {
                    if (Math.abs(this.cX - rect.cX) + this.sWidth > rect.sWidth) {
                        this.nextSpeedArr[0] = -(this.nextSpeedArr[0] || this.speedArr[0])
                        this.moveTo(this.cX > rect.cX ? 
                            rect.x + rect.w - this.w : rect.x, this.y)
                    }
                    if (Math.abs(this.cY - rect.cY) + this.sHeight > rect.sHeight) {
                        this.nextSpeedArr[1] = -(this.nextSpeedArr[1] || this.speedArr[1])
                        this.moveTo(this.x, this.cY > rect.cY ? 
                            rect.y + rect.h - this.h : rect.y)
                    }
                }
            }

            carve (cX, cY) {
                let result = [],
                    temp = [],
                    dX = cX - this.x,
                    dY = cY - this.y,
                    carveX = dX > 0 && dX < this.w,
                    carveY = dY > 0 && dY < this.h

                if (carveX && carveY) {
                    temp = this.carve(cX, this.y);
                    while (temp.length) {
                        result = result.concat(temp.shift().carve(this.x, cY));
                    }

                } else if (carveX) {
                    result.push(
                        new Rect(this.x, this.y, dX, this.h),
                        new Rect(cX, this.y, this.w - dX, this.h)
                    )
                
                } else if (carveY) {
                    result.push(
                        new Rect(this.x, this.y, this.w, dY),
                        new Rect(this.x, cY, this.w, this.h - dY)
                    )
                }

                return result
            }

            isApproach (rect1, rect2) {
                let tRect1 = tempRectArr[0]
                let tRect2 = tempRectArr[1]

                tRect1.copy(rect1)
                tRect2.copy(rect2)

                tRect1.run();
                tRect2.run();

                return +(Math.pow(rect1.cX - rect2.cX, 2) - Math.pow(tRect1.cX - tRect2.cX, 2) +
                    Math.pow(rect1.cY - rect2.cY, 2) - Math.pow(tRect1.cY - tRect2.cY, 2)).toFixed(6) > 0 ?
                    true : false;
            }

            isCollide (rect1, rect2) {
                if (Math.abs(rect1.cX - rect2.cX) < rect1.sWidth + rect2.sWidth &&
                    Math.abs(rect1.cY - rect2.cY) < rect1.sHeight + rect2.sHeight &&
                    this.isApproach(rect1, rect2)) {

                    rect1.collide(rect2);
                    rect2.collide(rect1);
                }
            }
        }

        class Dot extends Rect {
            constructor(x, y, width, height, speedArr = [0,0]) {
                super(x, y, width, height, speedArr)
                this.x = x
                this.y = y
                this.radius = width * .5
                this.width = width
                this.height = height
                this.speedArr = speedArr
                this.nextSpeedArr = speedArr.slice()
                this.linkCount = 0
                this.updateColor()
            }

            updateColor (screenWidth, screenHeight) {
                this.color = `rgb(${Math.floor(255 * (1 - this.x / screenWidth))}, ${
                       Math.floor(255 * (1 - this.y / screenHeight))},${Math.floor(255 * (this.speedArr[0]/ 100))})`
            }

            draw (cxt) {
                cxt.fillStyle = this.color
                cxt.save()
                cxt.beginPath()
                cxt.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true)
                cxt.fill()
                cxt.restore()
            }

            willOut (width, height) {
                if (this.x + this.speedArr[0] > width || this.x + this.speedArr[0] < 0) {
                    this.speedArr[0] = - this.speedArr[0]
                }
                if (this.y + this.speedArr[1] > height || this.y + this.speedArr[1] < 1) {
                    this.speedArr[1] = - this.speedArr[1]
                }
            }

            linkWith (item, cxt) {
                cxt.strokeStyle = this.color
                cxt.lineWidth = .4
                cxt.beginPath()
                cxt.moveTo(this.x, this.y)
                cxt.lineTo(item.x, item.y)
                cxt.stroke()
                cxt.closePath()
                cxt.save()
                item.linkCount++
            }

            canLink (dots, cxt) {
                dots.forEach(dot => {
                    if (dot.linkCount < 6) {
                        this.linkWith(dot, cxt)
                    }
                })
            }

        }

        global.Dot = Dot
        global.Rect = Rect;
        global.Qtree = Qtree;
        
        let tempRectArr = []
        tempRectArr.push(
            new Rect(0, 0, 0, 0),
            new Rect(0, 0, 0, 0)
        );

    })(window);

    (function(global, doc) {
        const canvas = document.getElementById('cov')
        const cxt = canvas.getContext('2d')
        const Dot = global.Dot
        const Qtree = global.Qtree
        const Rect = global.Rect
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight - 10;

        let dotArr = []
        let tree

        canvas.height = screenHeight
        canvas.width = screenWidth
        canvas.setAttribute('style', `height: ${screenHeight}px; width: ${screenWidth}px`)

        for (let i = 0; i < 64; i++) {
            dotArr.push(
                new Dot(
                    Math.floor(Math.random() * (screenWidth - 20)), 
                    Math.floor(Math.random() * (screenHeight - 20)), 
                    Math.random() * 20 + 5, 
                    Math.random() * 20 + 5, 
                    [Math.random() * 10 + 20 * (Math.random() * 10 > 5 ? -1 : 1), Math.random() * 10 + 20 * (Math.random() * 10 > 5 ? -1 : 1)])
            )
        }


        tree = new Qtree(new Rect(0, 0, screenWidth, screenHeight))

        for (let i = 0, l = dotArr.length; i < l; i++) {
            tree.insert(dotArr[i])
        }

        var draw = function draw() {
            var tempRect = []

            cxt.clearRect(0, 0, screenWidth, screenHeight)

            tree.refresh()

            for (let i = 0, len = dotArr.length; i < len; i++) {

                tempRect = tree.retrieve(dotArr[i])
                dotArr[i].canLink(tempRect, cxt)

                for (let j = 0; j < tempRect.length; j++) {
                    dotArr[i].isCollide(dotArr[i], tempRect[j])
                }

                dotArr[i].collide(new Rect(0, 0, screenWidth, screenHeight), true);
            }

            for (let i = 0, len = dotArr.length; i < len; i++) {
                dotArr[i].run()
                dotArr[i].updateColor(screenWidth, screenHeight)
                dotArr[i].draw(cxt)
                dotArr[i].linkCount = 0
            }

            requestAnimationFrame(draw)
        }
        requestAnimationFrame(draw)

    })(window, window.document);