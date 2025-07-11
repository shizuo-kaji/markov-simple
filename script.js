document.addEventListener('DOMContentLoaded', () => {
    const numShopsInput = document.getElementById('numShops');
    // const applySettingsBtn = document.getElementById('applySettings'); // Removed as per user request
    const initialShareSettingsDiv = document.getElementById('currentShareSettings');
    const transitionMatrixSettingsDiv = document.getElementById('transitionMatrixSettings');
    const nextMonthBtn = document.getElementById('nextMonth');
    const resetSimulationBtn = document.getElementById('resetSimulation');
    const nextMonthDiagramBtn = document.getElementById('nextMonthDiagram');
    const resetSimulationDiagramBtn = document.getElementById('resetSimulationDiagram');
    const advanceFiveYearsBtn = document.getElementById('advanceFiveYears');
    const currentMonthSpan = document.getElementById('currentMonth');
    const currentSharesDiv = document.getElementById('currentShares');
    const shareChartCanvas = document.getElementById('shareChart');
    const transitionDiagramDiv = document.getElementById('transitionDiagram');
    const recurrenceRelationsDiv = document.getElementById('recurrenceRelations');

    // const applySettingsBtn = document.getElementById('applySettings'); // Removed as per user request

    let numShops = parseInt(numShopsInput.value);
    let initialSharesBaseline = []; // This will store the initial 100/numShops distribution for reset
    let transitionMatrix = [];
    let currentShares = [];
    let currentMonth = 0;
    let shareChart;

    // 初期設定の生成
    function generateSettings() {
        numShops = parseInt(numShopsInput.value);
        initialSharesBaseline = Array(numShops).fill(100 / numShops); // Set baseline for reset
        currentShares = [...initialSharesBaseline]; // Initialize current shares
        transitionMatrix = Array(numShops).fill(0).map(() => Array(numShops).fill(0));

        // 現在のシェア設定のUI生成
        initialShareSettingsDiv.innerHTML = '<h3>現在のシェア (%)</h3>';
        currentShares.forEach((share, i) => {
            const shopName = String.fromCharCode(65 + i);
            const div = document.createElement('div');
            div.className = 'share-slider-group';
            div.innerHTML = `
                <label for="currentShare${i}">ショップ ${shopName}:</label>
                <input type="range" id="currentShare${i}" min="0" max="100" value="${share.toFixed(0)}">
                <span id="currentShareValue${i}">${share.toFixed(0)}%</span>
            `;
            initialShareSettingsDiv.appendChild(div);

            const slider = document.getElementById(`currentShare${i}`);
            const valueSpan = document.getElementById(`currentShareValue${i}`);
            slider.oninput = () => {
                valueSpan.textContent = `${slider.value}%`;
                updateCurrentSharesFromSliders(); // Call the new function
            };
        });
        updateCurrentSharesFromSliders(); // 初期シェアの合計を調整

        // 推移確率行列のUI生成
        transitionMatrixSettingsDiv.innerHTML = '<h3>推移確率 (%)</h3>';
        const table = document.createElement('table');
        table.className = 'transition-matrix-table';
        let tableHTML = '<thead><tr><th>From \\ To</th>';
        for (let i = 0; i < numShops; i++) {
            tableHTML += `<th>${String.fromCharCode(65 + i)}</th>`;
        }
        tableHTML += '</tr></thead><tbody>';

        for (let i = 0; i < numShops; i++) {
            const fromShopName = String.fromCharCode(65 + i);
            tableHTML += `<tr><th>${fromShopName}</th>`;
            for (let j = 0; j < numShops; j++) {
                const defaultValue = (i === j) ? (100 / numShops).toFixed(0) : (0).toFixed(0); // 初期値を設定
                transitionMatrix[i][j] = parseInt(defaultValue); // Store as integer percentage
                tableHTML += `<td>
                    <button type="button" class="adjust-btn minus" data-row="${i}" data-col="${j}">-</button>
                    <input type="number" id="transition${i}-${j}" min="0" max="100" value="${defaultValue}">
                    <button type="button" class="adjust-btn plus" data-row="${i}" data-col="${j}">+</button>
                </td>`;
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</tbody>';
        table.innerHTML = tableHTML;
        transitionMatrixSettingsDiv.appendChild(table);

        // 推移確率の入力イベントリスナー
        for (let i = 0; i < numShops; i++) {
            for (let j = 0; j < numShops; j++) {
                const input = document.getElementById(`transition${i}-${j}`);
                input.oninput = () => {
                    updateTransitionMatrixFromInputs();
                };
            }
        }

        // Add event listeners for the new buttons
        document.querySelectorAll('.adjust-btn').forEach(button => {
            button.onclick = (event) => {
                const row = event.target.dataset.row;
                const col = event.target.dataset.col;
                const input = document.getElementById(`transition${row}-${col}`);
                let currentValue = parseInt(input.value);

                if (event.target.classList.contains('plus')) {
                    currentValue = Math.min(100, currentValue + 5);
                } else if (event.target.classList.contains('minus')) {
                    currentValue = Math.max(0, currentValue - 5);
                }
                input.value = currentValue;
                updateTransitionMatrixFromInputs();
            };
        });

        updateTransitionMatrixFromInputs(); // 初期推移確率の合計を調整

        resetSimulation();
        drawTransitionDiagram();
        displayRecurrenceRelations();
    }

    // スライダーから現在のシェアを更新し、合計を100%に調整
    function updateCurrentSharesFromSliders() {
        let tempShares = [];
        for (let i = 0; i < numShops; i++) {
            tempShares.push(parseFloat(document.getElementById(`currentShare${i}`).value));
        }

        const total = tempShares.reduce((sum, s) => sum + s, 0);

        if (total === 0) { // Avoid division by zero if all shares are 0
            currentShares = Array(numShops).fill(100 / numShops);
        } else {
            const adjustmentFactor = 100 / total;
            let adjustedShares = tempShares.map(s => s * adjustmentFactor);

            // Round to nearest integer and then ensure sum is 100
            let roundedShares = adjustedShares.map(s => Math.round(s));
            let roundedSum = roundedShares.reduce((sum, s) => sum + s, 0);
            let difference = 100 - roundedSum;

            // Distribute the difference by adding/subtracting 1 from shares
            // Prioritize adding/subtracting from shares that are not 0 or 100
            let i = 0;
            while (difference !== 0) {
                if (difference > 0) {
                    if (roundedShares[i] < 100) {
                        roundedShares[i]++;
                        difference--;
                    }
                } else { // difference < 0
                    if (roundedShares[i] > 0) {
                        roundedShares[i]--;
                        difference++;
                    }
                }
                i = (i + 1) % numShops; // Cycle through shares
            }
            currentShares = roundedShares;
        }

        // Set the baseline for future calculations
        initialSharesBaseline = [...currentShares];

        // Reset the simulation month to 0 whenever the initial shares are changed
        currentMonth = 0;
        currentMonthSpan.textContent = currentMonth;

        currentShares.forEach((share, i) => {
            const slider = document.getElementById(`currentShare${i}`);
            const valueSpan = document.getElementById(`currentShareValue${i}`);
            slider.value = share; // Set slider value directly to integer
            valueSpan.textContent = `${share}%`; // Display integer value
        });

        // currentShares is already updated, no need to set it again
        updateCurrentSharesDisplay();
        updateChart();
        drawTransitionDiagram(); // Update diagram after share change
    }

    // 入力から推移確率行列を更新し、行の合計を100%に調整
    function updateTransitionMatrixFromInputs() {
        for (let i = 0; i < numShops; i++) {
            let rowValues = [];
            for (let j = 0; j < numShops; j++) {
                const value = parseFloat(document.getElementById(`transition${i}-${j}`).value);
                rowValues.push(value);
            }

            const rowSum = rowValues.reduce((sum, v) => sum + v, 0);

            if (rowSum === 0) { // Avoid division by zero if all probabilities are 0
                // Distribute 100% evenly if all are zero
                rowValues = Array(numShops).fill(100 / numShops);
            } else {
                const adjustmentFactor = 100 / rowSum;
                rowValues = rowValues.map(v => v * adjustmentFactor);

                // Distribute any remaining floating point error to ensure sum is exactly 100
                const currentAdjustedSum = rowValues.reduce((sum, v) => sum + v, 0);
                const difference = 100 - currentAdjustedSum;
                if (Math.abs(difference) > 1e-9 && numShops > 0) { // Check for significant difference
                    rowValues[0] += difference; // Add/subtract difference to the first value in the row
                }
            }

            for (let j = 0; j < numShops; j++) {
                const input = document.getElementById(`transition${i}-${j}`);
                const adjustedValue = Math.round(rowValues[j]); // Round to nearest integer
                input.value = adjustedValue; // Display rounded integer value
                transitionMatrix[i][j] = adjustedValue; // Store as integer percentage
            }
        }
        drawTransitionDiagram();
        displayRecurrenceRelations();
    }

    // --- New Helper Functions for Matrix Operations ---

    // Function to multiply two matrices
    function multiplyMatrices(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const rowsB = B.length;
        const colsB = B[0].length;
        if (colsA !== rowsB) {
            throw new Error("Cannot multiply matrices: dimensions are not compatible.");
        }

        const C = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                for (let k = 0; k < colsA; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    }

    // Function to raise a matrix to a power (exponentiation by squaring)
    function power(matrix, exp) {
        if (exp === 0) {
            // Return identity matrix
            return matrix.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
        }
        if (exp === 1) {
            return matrix;
        }
        if (exp % 2 === 0) {
            const half = power(matrix, exp / 2);
            return multiplyMatrices(half, half);
        } else {
            return multiplyMatrices(matrix, power(matrix, exp - 1));
        }
    }

    // --- Rewritten Calculation Logic ---

    // Calculates shares for a specific month from the initial state
    function calculateSharesForMonth(month) {
        if (month === 0) {
            currentShares = [...initialSharesBaseline];
            return;
        }

        // 1. Convert transition matrix from percentages (0-100) to probabilities (0-1)
        const probMatrix = transitionMatrix.map(row => row.map(p => p / 100));

        // 2. Calculate the transition matrix to the power of the month
        const poweredMatrix = power(probMatrix, month);

        // 3. Multiply the initial shares vector by the powered matrix
        const initialSharesVector = initialSharesBaseline.map(s => s / 100);
        const nextShares = Array(numShops).fill(0);
        for (let j = 0; j < numShops; j++) { // For each resulting share
            for (let i = 0; i < numShops; i++) { // Sum over the initial shares
                nextShares[j] += initialSharesVector[i] * poweredMatrix[i][j];
            }
        }

        // 4. Normalize the result to ensure the sum is exactly 100
        const sumNextShares = nextShares.reduce((sum, s) => sum + s, 0);
        if (sumNextShares === 0) {
            currentShares = Array(numShops).fill(100 / numShops);
        } else {
            const adjustmentFactor = 1 / sumNextShares; // Already in probability, adjust to 1
            let adjustedShares = nextShares.map(s => s * adjustmentFactor * 100); // Convert to percentage

            let roundedShares = adjustedShares.map(s => Math.round(s));
            let roundedSum = roundedShares.reduce((sum, s) => sum + s, 0);
            let difference = 100 - roundedSum;

            let i = 0;
            while (difference !== 0) {
                if (difference > 0) {
                    if (roundedShares[i] < 100) {
                        roundedShares[i]++;
                        difference--;
                    }
                } else {
                    if (roundedShares[i] > 0) {
                        roundedShares[i]--;
                        difference++;
                    }
                }
                i = (i + 1) % numShops;
            }
            currentShares = roundedShares;
        }
    }

    // --- Update Simulation Flow ---

    function runAndDisplaySimulation() {
        calculateSharesForMonth(currentMonth);
        currentMonthSpan.textContent = currentMonth;
        updateCurrentSharesDisplay();
        updateChart();
        drawTransitionDiagram();
    }


    // 現在のシェア表示を更新
    function updateCurrentSharesDisplay() {
        currentSharesDiv.innerHTML = '';
        currentShares.forEach((share, i) => {
            const shopName = String.fromCharCode(65 + i);
            const p = document.createElement('p');
            p.textContent = `ショップ ${shopName}: ${share.toFixed(2)}%`;
            currentSharesDiv.appendChild(p);
        });
    }

    // グラフの更新
    function updateChart() {
        const labels = Array(numShops).fill(0).map((_, i) => `ショップ ${String.fromCharCode(65 + i)}`);
        const data = currentShares.map(share => share.toFixed(2));

        if (shareChart) {
            shareChart.data.labels = labels;
            shareChart.data.datasets[0].data = data;
            shareChart.update();
        } else {
            shareChart = new Chart(shareChartCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '市場シェア (%)',
                        data: data,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(255, 206, 86, 0.6)',
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(153, 102, 255, 0.6)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'シェア (%)'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y.toFixed(2) + '%';
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // 状態遷移ダイアグラムの描画
    function drawTransitionDiagram() {
        transitionDiagramDiv.innerHTML = '';
        const svgWidth = 600;
        const svgHeight = 400;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", svgWidth);
        svg.setAttribute("height", svgHeight);
        svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
        svg.style.border = "1px solid #ccc";

        const centerX = svgWidth / 2;
        const centerY = svgHeight / 2;
        const radius = Math.min(centerX, centerY) * 0.7;

        const nodeRadius = 30;
        const nodes = [];

        // ノードの配置
        for (let i = 0; i < numShops; i++) {
            const angle = (i / numShops) * 2 * Math.PI - Math.PI / 2; // 上から時計回り
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            nodes.push({ x, y, name: String.fromCharCode(65 + i) });

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", nodeRadius);
            circle.setAttribute("fill", "#007bff");
            circle.setAttribute("stroke", "#0056b3");
            circle.setAttribute("stroke-width", "2");
            svg.appendChild(circle);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y + 5);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "white");
            text.setAttribute("font-size", "20");
            text.textContent = String.fromCharCode(65 + i);
            svg.appendChild(text);

            // Display current share below the node
            const shareText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            shareText.setAttribute("x", x);
            shareText.setAttribute("y", y + nodeRadius + 15); // Position below the circle
            shareText.setAttribute("text-anchor", "middle");
            shareText.setAttribute("fill", "#333");
            shareText.setAttribute("font-size", "14");
            shareText.textContent = `${currentShares[i].toFixed(2)}%`;
            svg.appendChild(shareText);
        }

        // エッジの描画
        for (let i = 0; i < numShops; i++) {
            for (let j = 0; j < numShops; j++) {
                const probability = transitionMatrix[i][j];
                if (probability > 0) {
                    const startNode = nodes[i];
                    const endNode = nodes[j];

                    let path;
                    let textX, textY;

                    if (i === j) { // 自己ループ
                        const loopRadius = nodeRadius * 0.8;
                        const loopAngle = (i / numShops) * 2 * Math.PI - Math.PI / 2 + Math.PI / numShops; // ノードの少し外側
                        const loopX1 = startNode.x + nodeRadius * Math.cos(loopAngle - Math.PI / 6);
                        const loopY1 = startNode.y + nodeRadius * Math.sin(loopAngle - Math.PI / 6);
                        const loopX2 = startNode.x + nodeRadius * Math.cos(loopAngle + Math.PI / 6);
                        const loopY2 = startNode.y + nodeRadius * Math.sin(loopAngle + Math.PI / 6);

                        path = `M ${loopX1} ${loopY1} A ${loopRadius} ${loopRadius} 0 1 1 ${loopX2} ${loopY2}`;
                        textX = startNode.x + (nodeRadius + 35) * Math.cos(loopAngle);
                        textY = startNode.y + (nodeRadius + 35) * Math.sin(loopAngle);

                    } else { // 異なるノード間の遷移
                        const dx = endNode.x - startNode.x;
                        const dy = endNode.y - startNode.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        const startX = startNode.x + (dx * nodeRadius) / dist;
                        const startY = startNode.y + (dy * nodeRadius) / dist;
                        const endX = endNode.x - (dx * nodeRadius) / dist;
                        const endY = endNode.y - (dy * nodeRadius) / dist;

                        if (numShops > 2 && Math.abs(i - j) === 1 || Math.abs(i - j) === numShops - 1) { // 隣接ノードは曲線
                            const midX = (startNode.x + endNode.x) / 2;
                            const midY = (startNode.y + endNode.y) / 2;
                            const normalX = -dy;
                            const normalY = dx;
                            const controlPointDistance = 50; // 曲線の強さ

                            const controlX = midX + normalX * controlPointDistance / dist;
                            const controlY = midY + normalY * controlPointDistance / dist;

                            path = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
                            textX = (startX + controlX + endX) / 3;
                            textY = (startY + controlY + endY) / 3 - 20; // テキストを少し上に

                        } else { // 直線
                            path = `M ${startX} ${startY} L ${endX} ${endY}`;
                            textX = (startX + endX) / 2;
                            textY = (startY + endY) / 2 - 20; // テキストを少し上に
                        }
                    }

                    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    line.setAttribute("d", path);
                    line.setAttribute("stroke", "#6c757d");
                    line.setAttribute("stroke-width", "1.5");
                    line.setAttribute("fill", "none");
                    line.setAttribute("marker-end", "url(#arrowhead)");
                    svg.appendChild(line);

                    const probText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    probText.setAttribute("x", textX);
                    probText.setAttribute("y", textY);
                    probText.setAttribute("text-anchor", "middle");
                    probText.setAttribute("fill", "#333");
                    probText.setAttribute("font-size", "12");
                    probText.textContent = `${probability}%`;
                    svg.appendChild(probText);
                }
            }
        }

        // 矢印マーカーの定義
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "8");
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto");
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
        polygon.setAttribute("fill", "#6c757d");
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        transitionDiagramDiv.appendChild(svg);
    }

    // 連立漸化式の表示 (MathMLを使用)
    function displayRecurrenceRelations() {
        recurrenceRelationsDiv.innerHTML = '<h3>連立漸化式</h3>';
        const mathmlNamespace = "http://www.w3.org/1998/Math/MathML";

        const math = document.createElementNS(mathmlNamespace, "math");
        const mtable = document.createElementNS(mathmlNamespace, "mtable");

        for (let j = 0; j < numShops; j++) {
            const shopNameJ = String.fromCharCode(65 + j);
            const mtr = document.createElementNS(mathmlNamespace, "mtr");

            // Left-hand side: S_J(t+1)
            const mtdLHS = document.createElementNS(mathmlNamespace, "mtd");
            const msubsupLHS = document.createElementNS(mathmlNamespace, "msubsup");
            const miS = document.createElementNS(mathmlNamespace, "mi");
            miS.textContent = "S";
            const msubJ = document.createElementNS(mathmlNamespace, "msub");
            const miJ = document.createElementNS(mathmlNamespace, "mi");
            miJ.textContent = shopNameJ;
            msubJ.appendChild(miJ);
            msubsupLHS.appendChild(miS);
            msubsupLHS.appendChild(msubJ);

            const msupTplus1 = document.createElementNS(mathmlNamespace, "msup");
            const miT = document.createElementNS(mathmlNamespace, "mi");
            miT.textContent = "t";
            const mn1 = document.createElementNS(mathmlNamespace, "mn");
            mn1.textContent = "1";
            const moPlus = document.createElementNS(mathmlNamespace, "mo");
            moPlus.textContent = "+";
            const mrowTplus1 = document.createElementNS(mathmlNamespace, "mrow");
            mrowTplus1.appendChild(miT);
            mrowTplus1.appendChild(moPlus);
            mrowTplus1.appendChild(mn1);
            msupTplus1.appendChild(mrowTplus1);
            msubsupLHS.appendChild(msupTplus1);

            mtdLHS.appendChild(msubsupLHS);
            mtr.appendChild(mtdLHS);

            // Equals sign
            const mtdEq = document.createElementNS(mathmlNamespace, "mtd");
            const moEq = document.createElementNS(mathmlNamespace, "mo");
            moEq.setAttribute("maligngroup", "alignGroup1"); // Alignment point
            moEq.textContent = "=";
            mtdEq.appendChild(moEq);
            mtr.appendChild(mtdEq);

            // Right-hand side
            const mtdRHS = document.createElementNS(mathmlNamespace, "mtd");
            const mrowRHS = document.createElementNS(mathmlNamespace, "mrow");

            let firstTerm = true;
            for (let i = 0; i < numShops; i++) {
                const shopNameI = String.fromCharCode(65 + i);
                const prob = transitionMatrix[i][j]; // Now an integer percentage

                if (prob > 0) {
                    if (!firstTerm) {
                        const moPlusTerm = document.createElementNS(mathmlNamespace, "mo");
                        moPlusTerm.textContent = "+";
                        mrowRHS.appendChild(moPlusTerm);
                    }

                    // prob/100 S_I(t)
                    const mrowTerm = document.createElementNS(mathmlNamespace, "mrow");

                    const mnProb = document.createElementNS(mathmlNamespace, "mn");
                    mnProb.textContent = (prob / 100).toFixed(2); // Display as decimal
                    mrowTerm.appendChild(mnProb);

                    // No multiplication sign

                    const msubsupRHS = document.createElementNS(mathmlNamespace, "msubsup");
                    const miS_RHS = document.createElementNS(mathmlNamespace, "mi");
                    miS_RHS.textContent = "S";
                    const msubI = document.createElementNS(mathmlNamespace, "msub");
                    const miI = document.createElementNS(mathmlNamespace, "mi");
                    miI.textContent = shopNameI;
                    msubI.appendChild(miI);
                    msubsupRHS.appendChild(miS_RHS);
                    msubsupRHS.appendChild(msubI);

                    const msupT = document.createElementNS(mathmlNamespace, "msup");
                    const miT_RHS = document.createElementNS(mathmlNamespace, "mi");
                    miT_RHS.textContent = "t";
                    msupT.appendChild(miT_RHS);
                    msubsupRHS.appendChild(msupT);

                    mrowTerm.appendChild(msubsupRHS);
                    mrowRHS.appendChild(mrowTerm);
                    firstTerm = false;
                }
            }
            mtdRHS.appendChild(mrowRHS);
            mtr.appendChild(mtdRHS);
            mtable.appendChild(mtr);
        }
        math.appendChild(mtable);
        recurrenceRelationsDiv.appendChild(math);
    }

    // シミュレーションのリセット
    function resetSimulation() {
        currentMonth = 0;
        currentShares = [...initialSharesBaseline]; // Reset to the initial baseline
        // Update sliders to reflect the reset shares
        currentShares.forEach((share, i) => {
            const slider = document.getElementById(`currentShare${i}`);
            const valueSpan = document.getElementById(`currentShareValue${i}`);
            if (slider && valueSpan) { // Check if elements exist
                slider.value = share.toFixed(0);
                valueSpan.textContent = `${share.toFixed(0)}%`;
            }
        });
        currentMonthSpan.textContent = currentMonth;
        updateCurrentSharesDisplay();
        updateChart();
        drawTransitionDiagram(); // Update diagram after reset
    }

    // イベントリスナー
    numShopsInput.addEventListener('change', generateSettings);
    // const applySettingsBtn = document.getElementById('applySettings'); // Removed as per user request
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        runAndDisplaySimulation();
    });
    resetSimulationBtn.addEventListener('click', resetSimulation);

    // New buttons for diagram section
    nextMonthDiagramBtn.addEventListener('click', () => {
        currentMonth++;
        runAndDisplaySimulation();
    });
    resetSimulationDiagramBtn.addEventListener('click', resetSimulation);
    advanceFiveYearsBtn.addEventListener('click', () => {
        currentMonth += 60; // 5 years * 12 months/year = 60 months
        runAndDisplaySimulation();
    });

    // 初期表示
    generateSettings();
});
