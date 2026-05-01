// Board.js - Полностью исправленная версия

class Board {
    constructor(game) {
        this.game = game;
        this.boardSize = game.boardSize;
        this.board = [];
        this.selectedCell = null;
        this.lastMatchDetails = null;
        this.allFoundLines = [];
    }

    createBoard(size) {
        this.boardSize = size;
        this.board = [];
        this.selectedCell = null;
        this.lastMatchDetails = null;

        for (let y = 0; y < size; y++) {
            this.board[y] = [];
            for (let x = 0; x < size; x++) {
                this.board[y][x] = Math.floor(Math.random() * 6);
            }
        }

        this.removeInitialMatches();
        return this.board;
    }

    removeInitialMatches() {
        let matches = this.findAllMatches();
        let attempts = 0;
        const maxAttempts = 100;

        while (matches.length > 0 && attempts < maxAttempts) {
            attempts++;
            matches.forEach(({x, y}) => {
                this.board[y][x] = Math.floor(Math.random() * 6);
            });
            matches = this.findAllMatches();
        }
    }

    /// В классе Board полностью замените findAllMatches и findLtCombos
    // В классе Board полностью замените findAllMatches
    findAllMatches() {
        const matches = [];
        const matchDetails = [];
        const size = this.boardSize;

        // Используем РАЗДЕЛЬНЫЕ наборы для горизонтальных и вертикальных
        const hMatched = new Set();
        const vMatched = new Set();

        // Находим ВСЕ горизонтальные линии
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size - 2; x++) {
                const val = this.board[y][x];
                if (val === -1) continue;

                let length = 1;
                while (x + length < size && this.board[y][x + length] === val) {
                    length++;
                }

                if (length >= 3) {
                    const lineMatches = [];
                    for (let i = 0; i < length; i++) {
                        const key = `${x + i},${y}`;
                        hMatched.add(key);
                        matches.push({x: x + i, y});
                        lineMatches.push({x: x + i, y});
                    }

                    if (lineMatches.length >= 3) {
                        matchDetails.push({
                            type: 'horizontal',
                            length: length,
                            color: val,
                            positions: lineMatches,
                            startX: x, startY: y,
                            endX: x + length - 1, endY: y,
                            centerX: x + Math.floor(length / 2),
                            centerY: y,
                            isLine: true
                        });
                    }
                }
                x += length - 1;
            }
        }

        // Находим ВСЕ вертикальные линии (НЕЗАВИСИМО от горизонтальных)
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size - 2; y++) {
                const val = this.board[y][x];
                if (val === -1) continue;

                let length = 1;
                while (y + length < size && this.board[y + length][x] === val) {
                    length++;
                }

                if (length >= 3) {
                    const lineMatches = [];
                    for (let i = 0; i < length; i++) {
                        const key = `${x},${y + i}`;
                        vMatched.add(key);
                        // Добавляем в matches только если ещё нет (для совместимости)
                        if (!hMatched.has(key)) {
                            matches.push({x, y: y + i});
                        }
                        lineMatches.push({x, y: y + i});
                    }

                    if (lineMatches.length >= 3) {
                        matchDetails.push({
                            type: 'vertical',
                            length: length,
                            color: val,
                            positions: lineMatches,
                            startX: x, startY: y,
                            endX: x, endY: y + length - 1,
                            centerX: x,
                            centerY: y + Math.floor(length / 2),
                            isLine: true
                        });
                    }
                }
                y += length - 1;
            }
        }

        // Ищем L/T комбинации
        const hLines = matchDetails.filter(l => l.type === 'horizontal');
        const vLines = matchDetails.filter(l => l.type === 'vertical');

        const specialCombos = [];

        if (hLines.length > 0 && vLines.length > 0) {
            for (const h of hLines) {
                for (const v of vLines) {
                    if (h.color !== v.color) continue;

                    for (const hp of h.positions) {
                        for (const vp of v.positions) {
                            if (hp.x === vp.x && hp.y === vp.y) {
                                const ix = hp.x;
                                const iy = hp.y;
                                const hEnd = (ix === h.startX || ix === h.endX);
                                const vEnd = (iy === v.startY || iy === v.endY);

                                if (hEnd && vEnd) {
                                    specialCombos.push({
                                        type: 'L-shape', length: h.length + v.length - 1,
                                        color: h.color, centerX: ix, centerY: iy,
                                        isSpecial: true, bonusType: 'bomb'
                                    });
                                    console.log('🎉 L-SHAPE! color:', h.color, 'at', ix, iy);
                                } else if (hEnd || vEnd) {
                                    specialCombos.push({
                                        type: 'T-shape', length: h.length + v.length - 1,
                                        color: h.color, centerX: ix, centerY: iy,
                                        isSpecial: true, bonusType: 'cross'
                                    });
                                    console.log('🎉 T-SHAPE! color:', h.color, 'at', ix, iy);
                                }
                            }
                        }
                    }
                }
            }
        }

        const finalSpecials = [];
        const l = specialCombos.find(c => c.type === 'L-shape');
        const t = specialCombos.find(c => c.type === 'T-shape');
        if (l) finalSpecials.push(l);
        if (t && finalSpecials.length < 2) finalSpecials.push(t);

        console.log('📊 H:', hLines.length, 'V:', vLines.length, 'Special:', finalSpecials.length);

        this.lastMatchDetails = [...matchDetails, ...finalSpecials];

        return matches;
    }

// Поиск L/T комбинаций - перебираем позиции линий
    findLtCombos(allLines, currentLines) {
        const combos = [];

        // Проверяем только если есть и горизонтальные и вертикальные линии
        const hasH = currentLines.some(l => l.type === 'horizontal');
        const hasV = currentLines.some(l => l.type === 'vertical');

        // Для L/T нужно чтобы в текущем вызове были линии обоих типов
        // Или одна линия из текущего вызова пересекается с накопленной
        const checkLines = (hasH && hasV) ? currentLines : allLines;

        // Группируем по цвету
        const byColor = {};
        for (const line of checkLines) {
            if (!byColor[line.color]) byColor[line.color] = [];
            byColor[line.color].push(line);
        }

        // Для каждого цвета ищем пересечения
        for (const color in byColor) {
            const lines = byColor[color];
            const hLines = lines.filter(l => l.type === 'horizontal');
            const vLines = lines.filter(l => l.type === 'vertical');

            if (hLines.length === 0 || vLines.length === 0) continue;

            for (const h of hLines) {
                for (const v of vLines) {
                    // Проверяем, что линии разного цвета? Нет, одного!
                    if (h.color !== v.color) continue;

                    // Ищем общую точку: x из вертикальной, y из горизонтальной
                    // при условии что эта точка есть в ОБЕИХ линиях
                    for (const hPos of h.positions) {
                        for (const vPos of v.positions) {
                            if (hPos.x === vPos.x && hPos.y === vPos.y) {
                                // Нашли общую точку! Это пересечение.
                                const ix = hPos.x;
                                const iy = hPos.y;

                                // Определяем тип
                                const hEnd = (ix === h.startX || ix === h.endX);
                                const vEnd = (iy === v.startY || iy === v.endY);

                                if (hEnd && vEnd) {
                                    combos.push({
                                        type: 'L-shape',
                                        length: h.length + v.length - 1,
                                        color: parseInt(color),
                                        centerX: ix,
                                        centerY: iy,
                                        isSpecial: true,
                                        bonusType: 'bomb'
                                    });
                                    console.log('🎉 L-SHAPE! color:', color, 'at', ix, iy);
                                    return [combos[0]]; // Сразу возвращаем L-shape
                                } else if (hEnd || vEnd) {
                                    combos.push({
                                        type: 'T-shape',
                                        length: h.length + v.length - 1,
                                        color: parseInt(color),
                                        centerX: ix,
                                        centerY: iy,
                                        isSpecial: true,
                                        bonusType: 'cross'
                                    });
                                    console.log('🎉 T-SHAPE! color:', color, 'at', ix, iy);
                                    // Не выходим, может быть ещё L-shape
                                }
                            }
                        }
                    }
                }
            }
        }

        // Возвращаем максимум 1 L и 1 T
        const result = [];
        const l = combos.find(c => c.type === 'L-shape');
        const t = combos.find(c => c.type === 'T-shape');
        if (l) result.push(l);
        if (t && result.length < 2) result.push(t);

        if (result.length > 0) {
            console.log('🏆 Special combos:', result.map(c => c.type).join(', '));
        }

        return result;
    }

// Сброс линий хода (вызывается в trySwap)
    resetTurnLines() {
        this._turnLines = [];
        console.log('🔄 Turn lines reset');
    }

// Поиск L/T комбинаций
    findLtCombos(allLines) {
        const combos = [];
        const usedLineKeys = new Set();

        const getKey = (line) => `${line.type}_${line.startX}_${line.startY}_${line.endX}_${line.endY}_${line.color}`;

        // Для каждого цвета ищем пересечения
        const byColor = {};
        for (const line of allLines) {
            if (!byColor[line.color]) byColor[line.color] = [];
            byColor[line.color].push(line);
        }

        for (const color in byColor) {
            const lines = byColor[color];
            const hLines = lines.filter(l => l.type === 'horizontal');
            const vLines = lines.filter(l => l.type === 'vertical');

            if (hLines.length === 0 || vLines.length === 0) continue;

            for (const h of hLines) {
                if (usedLineKeys.has(getKey(h))) continue;

                for (const v of vLines) {
                    if (usedLineKeys.has(getKey(v))) continue;

                    // Проверяем пересечение: вертикальная проходит через y горизонтальной
                    // и горизонтальная проходит через x вертикальной
                    const ix = v.centerX;
                    const iy = h.centerY;

                    if (ix >= h.startX && ix <= h.endX && iy >= v.startY && iy <= v.endY) {
                        // Пересечение есть! Определяем тип
                        const hEnd = (ix === h.startX || ix === h.endX);
                        const vEnd = (iy === v.startY || iy === v.endY);

                        if (hEnd && vEnd) {
                            // L-shape
                            usedLineKeys.add(getKey(h));
                            usedLineKeys.add(getKey(v));
                            combos.push({
                                type: 'L-shape', length: h.length + v.length - 1,
                                color: parseInt(color), centerX: ix, centerY: iy,
                                isSpecial: true, bonusType: 'bomb'
                            });
                            console.log('🎉 L-SHAPE! color:', color, 'at', ix, iy,
                                'H:', h.length, 'V:', v.length);
                        } else if (hEnd || vEnd) {
                            // T-shape
                            usedLineKeys.add(getKey(h));
                            usedLineKeys.add(getKey(v));
                            combos.push({
                                type: 'T-shape', length: h.length + v.length - 1,
                                color: parseInt(color), centerX: ix, centerY: iy,
                                isSpecial: true, bonusType: 'cross'
                            });
                            console.log('🎉 T-SHAPE! color:', color, 'at', ix, iy,
                                'H:', h.length, 'V:', v.length);
                        }
                    }
                }
            }
        }

        // Возвращаем максимум 1 L и 1 T
        const result = [];
        const l = combos.find(c => c.type === 'L-shape');
        const t = combos.find(c => c.type === 'T-shape');
        if (l) result.push(l);
        if (t && result.length < 2) result.push(t);

        if (result.length > 0) {
            console.log('🏆 Special combos this call:', result.map(c => c.type).join(', '));
        }

        return result;
    }



// Новый метод: накопление линий
    accumulateLines(newLines) {
        if (!this.allLinesForMove) {
            this.allLinesForMove = [];
        }

        // Добавляем новые линии, избегая дубликатов по ID
        for (const newLine of newLines) {
            const exists = this.allLinesForMove.some(l => l.id === newLine.id);
            if (!exists) {
                this.allLinesForMove.push(newLine);
            }
        }

        console.log('📊 New lines:', newLines.length, '| Total accumulated:', this.allLinesForMove.length);
    }


// Поиск специальных комбинаций среди накопленных линий
    findSpecialCombos(allLines) {
        if (!allLines || allLines.length < 2) return [];

        const specialCombos = [];
        const usedLineIds = new Set();

        // Группируем по цвету
        const byColor = {};
        for (const line of allLines) {
            if (!byColor[line.color]) byColor[line.color] = [];
            byColor[line.color].push(line);
        }

        // Для каждого цвета ищем пересечения
        for (const color in byColor) {
            const lines = byColor[color];
            const hLines = lines.filter(l => l.type === 'horizontal' && !usedLineIds.has(l.id));
            const vLines = lines.filter(l => l.type === 'vertical' && !usedLineIds.has(l.id));

            if (hLines.length === 0 || vLines.length === 0) continue;

            for (const h of hLines) {
                if (usedLineIds.has(h.id)) continue;

                for (const v of vLines) {
                    if (usedLineIds.has(v.id)) continue;

                    // Точка пересечения
                    const ix = v.centerX;
                    const iy = h.centerY;

                    // Пересекаются ли линии?
                    if (ix >= h.startX && ix <= h.endX && iy >= v.startY && iy <= v.endY) {

                        // Проверяем, что это угол
                        const hEnd = (ix === h.startX || ix === h.endX);
                        const vEnd = (iy === v.startY || iy === v.endY);

                        if (hEnd && vEnd) {
                            // L-образная комбинация!
                            usedLineIds.add(h.id);
                            usedLineIds.add(v.id);
                            specialCombos.push({
                                type: 'L-shape',
                                length: h.length + v.length - 1,
                                color: parseInt(color),
                                centerX: ix,
                                centerY: iy,
                                isSpecial: true,
                                bonusType: 'bomb'
                            });
                            console.log('🎉 L-SHAPE! color:', color, 'at', ix, iy);
                            break; // эта горизонталь использована
                        } else if (hEnd || vEnd) {
                            // T-образная комбинация!
                            usedLineIds.add(h.id);
                            usedLineIds.add(v.id);
                            specialCombos.push({
                                type: 'T-shape',
                                length: h.length + v.length - 1,
                                color: parseInt(color),
                                centerX: ix,
                                centerY: iy,
                                isSpecial: true,
                                bonusType: 'cross'
                            });
                            console.log('🎉 T-SHAPE! color:', color, 'at', ix, iy);
                            break; // эта горизонталь использована
                        }
                    }
                }
            }
        }

        // Максимум 1 L и 1 T
        const result = [];
        const lShape = specialCombos.find(c => c.type === 'L-shape');
        const tShape = specialCombos.find(c => c.type === 'T-shape');
        if (lShape) result.push(lShape);
        if (tShape && result.length < 2) result.push(tShape);

        console.log('🔍 Special combos:', result.length, result.map(c => c.type).join(', '));
        return result;
    }


    findSpecialCombosNow(lineDetails) {
        const specialCombos = [];
        const usedLines = new Set();

        // Группируем по цвету
        const byColor = {};
        for (const line of lineDetails) {
            if (!line.isLine) continue;
            const c = line.color;
            if (!byColor[c]) byColor[c] = [];
            byColor[c].push(line);
        }

        // Проверяем каждый цвет
        for (const color in byColor) {
            const lines = byColor[color];
            const hLines = lines.filter(l => l.type === 'horizontal');
            const vLines = lines.filter(l => l.type === 'vertical');

            // Нужны оба типа
            if (hLines.length === 0 || vLines.length === 0) continue;

            // Проверяем все пары горизонталь+вертикаль
            for (const h of hLines) {
                if (usedLines.has(h)) continue;

                for (const v of vLines) {
                    if (usedLines.has(v)) continue;

                    const ix = v.centerX;
                    const iy = h.centerY;

                    // Пересечение в пределах обеих линий?
                    if (ix >= h.startX && ix <= h.endX && iy >= v.startY && iy <= v.endY) {

                        // Это угол?
                        const hEnd = (ix === h.startX || ix === h.endX);
                        const vEnd = (iy === v.startY || iy === v.endY);

                        if (hEnd && vEnd) {
                            // L-shape
                            usedLines.add(h);
                            usedLines.add(v);
                            specialCombos.push({
                                type: 'L-shape',
                                length: h.length + v.length - 1,
                                color: parseInt(color),
                                centerX: ix,
                                centerY: iy,
                                isSpecial: true,
                                bonusType: 'bomb'
                            });
                            console.log('🎉 L-SHAPE found at', ix, iy, 'color:', color);
                            break; // Переходим к следующей горизонтальной
                        } else if (hEnd || vEnd) {
                            // T-shape
                            usedLines.add(h);
                            usedLines.add(v);
                            specialCombos.push({
                                type: 'T-shape',
                                length: h.length + v.length - 1,
                                color: parseInt(color),
                                centerX: ix,
                                centerY: iy,
                                isSpecial: true,
                                bonusType: 'cross'
                            });
                            console.log('🎉 T-SHAPE found at', ix, iy, 'color:', color);
                            break; // Переходим к следующей горизонтальной
                        }
                    }
                }
            }
        }

        // Ограничиваем: максимум 1 L и 1 T
        const result = [];
        const lShape = specialCombos.find(c => c.type === 'L-shape');
        const tShape = specialCombos.find(c => c.type === 'T-shape');

        if (lShape) result.push(lShape);
        if (tShape && result.length < 2) result.push(tShape);

        console.log('🔍 Special combos found:', result.length, result.map(c => c.type).join(', '));
        return result;
    }

    // Убираем сохранение линий - метод resetFoundLines можно удалить или оставить пустым
    resetFoundLines() {
        // Ничего не делаем
    }


// Исправленный findSpecialCombos
    // Исправленный findSpecialCombos
 //   findSpecialCombos(lineDetails) {
 //       const specialCombos = [];
 //       const processed = new Set();
//
 //       console.log('🔍 Searching for special combos among', lineDetails.length, 'lines');
//
 //       // Ищем пересечения между горизонтальными и вертикальными линиями
 //       for (let i = 0; i < lineDetails.length; i++) {
 //           const line1 = lineDetails[i];
 //           if (!line1.isLine) continue;
//
 //           for (let j = i + 1; j < lineDetails.length; j++) {
 //               const line2 = lineDetails[j];
 //               if (!line2.isLine) continue;
//
 //               // Нужны линии разного направления
 //               if (line1.type === line2.type) continue;
//
 //               // Определяем горизонтальную и вертикальную линии
 //               const hLine = line1.type === 'horizontal' ? line1 : line2;
 //               const vLine = line1.type === 'vertical' ? line1 : line2;
//
 //               // Проверяем пересечение
 //               const hY = hLine.centerY;
 //               const vX = vLine.centerX;
//
 //               const hContains = vX >= hLine.startX && vX <= hLine.endX;
 //               const vContains = hY >= vLine.startY && hY <= vLine.endY;
//
 //               if (hContains && vContains) {
 //                   const intersection = { x: vX, y: hY };
 //                   const key = `${intersection.x},${intersection.y}`;
//
 //                   if (!processed.has(key)) {
 //                       processed.add(key);
//
 //                       // Определяем тип комбинации
 //                       const atHStart = intersection.x === hLine.startX;
 //                       const atHEnd = intersection.x === hLine.endX;
 //                       const atVStart = intersection.y === vLine.startY;
 //                       const atVEnd = intersection.y === vLine.endY;
//
 //                       console.log(`  Intersection at (${intersection.x},${intersection.y}): H(${atHStart},${atHEnd}) V(${atVStart},${atVEnd})`);
//
 //                       let comboType = null;
 //                       let bonusType = null;
//
 //                       // L-образная
 //                       if ((atHStart || atHEnd) && (atVStart || atVEnd)) {
 //                           comboType = 'L-shape';
 //                           bonusType = 'bomb';
 //                           console.log('  🎉 L-SHAPE!');
 //                       }
 //                       // T-образная
 //                       else if ((atHStart || atHEnd) && !atVStart && !atVEnd) {
 //                           comboType = 'T-shape';
 //                           bonusType = 'cross';
 //                           console.log('  🎉 T-SHAPE (H crosses V)!');
 //                       }
 //                       else if (!atHStart && !atHEnd && (atVStart || atVEnd)) {
 //                           comboType = 'T-shape';
 //                           bonusType = 'cross';
 //                           console.log('  🎉 T-SHAPE (V crosses H)!');
 //                       }
//
 //                       if (comboType) {
 //                           specialCombos.push({
 //                               type: comboType,
 //                               length: hLine.length + vLine.length - 1,
 //                               color: this.board[intersection.y][intersection.x],
 //                               centerX: intersection.x,
 //                               centerY: intersection.y,
 //                               isSpecial: true,
 //                               bonusType: bonusType
 //                           });
 //                       }
 //                   }
 //               }
 //           }
 //       }
//
 //       console.log('🔍 Found', specialCombos.length, 'special combos');
 //       return specialCombos;
 //   }
//
    // Новый метод для поиска L и T комбинаций
    findSpecialCombos(lineDetails) {
        const specialCombos = [];
        const usedPositions = new Set(); // Отслеживаем использованные позиции

        // Группируем линии по цвету
        const linesByColor = {};
        lineDetails.forEach(line => {
            if (!line.isLine || line.length < 3) return;
            if (!linesByColor[line.color]) {
                linesByColor[line.color] = { horizontal: [], vertical: [] };
            }
            if (line.type === 'horizontal') {
                linesByColor[line.color].horizontal.push(line);
            } else {
                linesByColor[line.color].vertical.push(line);
            }
        });

        // Для каждого цвета проверяем пересечения
        for (const color in linesByColor) {
            const hLines = linesByColor[color].horizontal;
            const vLines = linesByColor[color].vertical;

            // Нужны хотя бы одна горизонтальная и одна вертикальная линия одного цвета
            if (hLines.length === 0 || vLines.length === 0) continue;

            for (const hLine of hLines) {
                for (const vLine of vLines) {
                    // Проверяем, что линии действительно пересекаются
                    const intersectX = vLine.centerX;
                    const intersectY = hLine.centerY;

                    // Пересечение должно быть в пределах обеих линий
                    if (intersectX < hLine.startX || intersectX > hLine.endX) continue;
                    if (intersectY < vLine.startY || intersectY > vLine.endY) continue;

                    // Проверяем, что в точке пересечения действительно кристалл нужного цвета
                    if (this.board[intersectY][intersectX] !== parseInt(color)) continue;

                    // Проверяем, что пересечение образует угол (не просто крест в середине)
                    const atHEnd = (intersectX === hLine.startX || intersectX === hLine.endX);
                    const atVEnd = (intersectY === vLine.startY || intersectY === vLine.endY);

                    // Пропускаем пересечения в середине обеих линий (это просто крест)
                    if (!atHEnd && !atVEnd) continue;

                    // Проверяем, что пересечение уникально
                    const posKey = `${intersectX},${intersectY}`;
                    if (usedPositions.has(posKey)) continue;

                    // Определяем тип комбинации
                    let comboType = null;
                    let bonusType = null;

                    if (atHEnd && atVEnd) {
                        // L-образная: уголок
                        comboType = 'L-shape';
                        bonusType = 'bomb';
                    } else if (atHEnd || atVEnd) {
                        // T-образная: одна линия упирается в середину другой
                        comboType = 'T-shape';
                        bonusType = 'cross';
                    }

                    if (comboType) {
                        usedPositions.add(posKey);

                        // Добавляем все позиции линий в использованные
                        hLine.positions.forEach(p => usedPositions.add(`${p.x},${p.y}`));
                        vLine.positions.forEach(p => usedPositions.add(`${p.x},${p.y}`));

                        specialCombos.push({
                            type: comboType,
                            length: hLine.length + vLine.length - 1,
                            color: parseInt(color),
                            centerX: intersectX,
                            centerY: intersectY,
                            isSpecial: true,
                            bonusType: bonusType
                        });

                        console.log(`🎉 ${comboType} found: color=${color}, at (${intersectX},${intersectY}), H-length=${hLine.length}, V-length=${vLine.length}`);
                    }
                }
            }
        }

        // Ограничиваем количество специальных комбинаций
        const uniqueCombos = [];
        const seenTypes = new Set();

        // Приоритет: L-shape > T-shape
        const lShapes = specialCombos.filter(c => c.type === 'L-shape');
        const tShapes = specialCombos.filter(c => c.type === 'T-shape');

        // Добавляем максимум 1 L-shape и 1 T-shape
        if (lShapes.length > 0) {
            uniqueCombos.push(lShapes[0]);
            seenTypes.add('L-shape');
        }
        if (tShapes.length > 0 && uniqueCombos.length < 2) {
            uniqueCombos.push(tShapes[0]);
            seenTypes.add('T-shape');
        }

        console.log('🔍 Found', uniqueCombos.length, 'unique special combos (filtered from', specialCombos.length, ')');
        return uniqueCombos;
    }

// Находим точку пересечения
    findIntersection(hLine, vLine) {
        // Проверяем, что вертикальная линия проходит через y горизонтальной
        if (vLine.startY <= hLine.centerY && vLine.endY >= hLine.centerY) {
            // Проверяем, что горизонтальная линия проходит через x вертикальной
            if (hLine.startX <= vLine.centerX && hLine.endX >= vLine.centerX) {
                return { x: vLine.centerX, y: hLine.centerY };
            }
        }
        return null;
    }

// Классифицируем комбинацию
    classifyCombo(hLine, vLine, intersection) {
        const atHStart = intersection.x === hLine.startX;
        const atHEnd = intersection.x === hLine.endX;
        const atVStart = intersection.y === vLine.startY;
        const atVEnd = intersection.y === vLine.endY;

        // L-образная: пересечение на концах обеих линий
        if ((atHStart || atHEnd) && (atVStart || atVEnd)) {
            return { type: 'L-shape', bonus: 'bomb' };
        }

        // T-образная: одна линия пересекает другую посередине
        if ((atHStart || atHEnd) && !atVStart && !atVEnd) {
            return { type: 'T-shape', bonus: 'cross' };
        }
        if (!atHStart && !atHEnd && (atVStart || atVEnd)) {
            return { type: 'T-shape', bonus: 'cross' };
        }

        return null;
    }

    hasMatchesAfterSwap(x1, y1, x2, y2) {
        // Сохраняем текущие накопленные линии
        const savedTurnLines = this._turnLines ? [...this._turnLines] : [];

        this.swap(x1, y1, x2, y2);
        const matches = this.findAllMatches();
        this.swap(x1, y1, x2, y2);

        // Восстанавливаем сохраненные линии (отменяем изменения от findAllMatches)
        this._turnLines = savedTurnLines;

        return matches.length > 0;
    }

    swap(x1, y1, x2, y2) {
        const temp = this.board[y1][x1];
        this.board[y1][x1] = this.board[y2][x2];
        this.board[y2][x2] = temp;
    }

    applyGravity() {
        for (let x = 0; x < this.boardSize; x++) {
            const column = [];
            for (let y = 0; y < this.boardSize; y++) {
                if (this.board[y][x] !== -1) {
                    column.push(this.board[y][x]);
                }
            }

            for (let y = this.boardSize - 1; y >= 0; y--) {
                const index = y - (this.boardSize - column.length);
                if (index >= 0) {
                    this.board[y][x] = column[index];
                } else {
                    this.board[y][x] = -1;
                }
            }
        }
    }

    fillEmptyCells() {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === -1) {
                    this.board[y][x] = Math.floor(Math.random() * 6);
                }
            }
        }
    }

    getSafeCrystal(x, y) {
        return Math.floor(Math.random() * 6);
    }

    findMatchesAt(x, y) {
        return [];
    }

    // ============= МЕТОДЫ ДЛЯ ОТРИСОВКИ =============

    render() {
        const boardElement = document.getElementById('gameBoard');
        if (!boardElement) return;

        const gridElement = document.createElement('div');
        gridElement.className = 'board-grid';
        gridElement.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
        gridElement.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = this.createCellElement(x, y);
                gridElement.appendChild(cell);
            }
        }

        boardElement.innerHTML = '';
        boardElement.appendChild(gridElement);
    }

    createCellElement(x, y) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.dataset.row = y;
        cell.dataset.col = x;

        const crystalValue = this.board[y][x];

        if (window.themeManager) {
            if (crystalValue !== -1) {
                cell.style.backgroundImage = window.themeManager.getCrystalImage(crystalValue);
                cell.style.backgroundSize = 'contain';
                cell.style.backgroundPosition = 'center';
                cell.style.backgroundRepeat = 'no-repeat';
                const theme = window.themeManager.themes[window.themeManager.currentTheme];
                cell.style.boxShadow = theme.effects.cellShadow;
            }
        } else {
            if (crystalValue !== -1) {
                const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
                cell.style.background = colors[crystalValue] || '#ddd';
            }
        }

        if (this.selectedCell && this.selectedCell.x === x && this.selectedCell.y === y) {
            cell.classList.add('selected');
        }

        return cell;
    }

    updateCell(x, y) {
        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (!cell) return;

        const crystalValue = this.board[y][x];

        if (window.themeManager) {
            if (crystalValue !== -1) {
                cell.style.backgroundImage = window.themeManager.getCrystalImage(crystalValue);
                cell.style.backgroundSize = 'contain';
                cell.style.backgroundPosition = 'center';
                cell.style.backgroundRepeat = 'no-repeat';
            }
        }
    }

    selectCell(x, y) {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected');
        });

        const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) {
            cell.classList.add('selected');
            this.selectedCell = { x, y };
        }
    }

    deselectAll() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected');
        });
        this.selectedCell = null;
    }

    highlightMatches(matches) {
        matches.forEach(({x, y}) => {
            const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (cell) {
                cell.classList.add('match-highlight');
                setTimeout(() => {
                    cell.classList.remove('match-highlight');
                }, 300);
            }
        });
    }

    printBoard() {
        console.log('Board state:');
        for (let y = 0; y < this.boardSize; y++) {
            let row = '';
            for (let x = 0; x < this.boardSize; x++) {
                row += (this.board[y][x] === -1 ? '.' : this.board[y][x]) + ' ';
            }
            console.log(row);
        }
    }
}