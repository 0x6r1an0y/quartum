document.addEventListener('DOMContentLoaded', () => {
    const qubitCountInput = document.getElementById('qubit-count');
    const generateCircuitBtn = document.getElementById('generate-circuit');
    const quantumCircuitDiv = document.getElementById('quantum-circuit');
    const gates = document.querySelectorAll('#gate-toolbox .gate');
    const probabilityDiv = document.getElementById('probabilities');
    const runSimulationBtn = document.getElementById('run-simulation');

    let draggedGate = null;
    let circuit = []; // 用來存儲電路狀態的陣列 [[gate, gate], [gate, null], ...]

    function initializeCircuit(numQubits) {
        quantumCircuitDiv.innerHTML = ''; // 清空現有電路
        circuit = [];
        for (let i = 0; i < numQubits; i++) {
            const lineContainer = document.createElement('div');
            lineContainer.classList.add('qubit-line-container');

            const label = document.createElement('div');
            label.classList.add('qubit-label');
            label.textContent = `q${i}`;
            lineContainer.appendChild(label);

            const wire = document.createElement('div');
            wire.classList.add('qubit-wire');
            wire.dataset.qubitIndex = i; // 標記這是第幾條量子線

            // 為每條線增加多個放置點 (時間步)
            for (let j = 0; j < 15; j++) { // 假設最多15個時間步
                const placeholder = document.createElement('div');
                placeholder.classList.add('gate-placeholder');
                placeholder.dataset.timeStep = j;
                placeholder.addEventListener('dragover', dragOver);
                placeholder.addEventListener('drop', dropGate);
                wire.appendChild(placeholder);
            }
            lineContainer.appendChild(wire);
            quantumCircuitDiv.appendChild(lineContainer);
            circuit.push(new Array(15).fill(null)); // 初始化電路狀態陣列
        }
        updateProbabilityDisplay(numQubits, true); // 重設時更新機率
        runSimulationBtn.disabled = false;
    }

    // 拖動開始
    gates.forEach(gate => {
        gate.addEventListener('dragstart', (event) => {
            draggedGate = event.target;
            event.dataTransfer.setData('text/plain', event.target.dataset.gate);
            setTimeout(() => {
                // event.target.style.display = 'none'; // 可選：拖動時隱藏原閘
            }, 0);
        });
        gate.addEventListener('dragend', () => {
            // draggedGate.style.display = 'block'; // 可選：恢復顯示
            draggedGate = null;
        });
    });

    function dragOver(event) {
        event.preventDefault(); // 必須，否則 drop 事件不觸發
        if (event.target.classList.contains('gate-placeholder') && !event.target.hasChildNodes()) {
             event.target.style.border = '2px dashed #3498db'; // 提示可以放置
        }
    }

    function dropGate(event) {
        event.preventDefault();
        event.target.style.border = '1px dashed #ccc'; // 恢復樣式
        const targetPlaceholder = event.target.closest('.gate-placeholder');

        if (targetPlaceholder && draggedGate && !targetPlaceholder.hasChildNodes()) {
            const gateType = draggedGate.dataset.gate;
            const qubitIndex = parseInt(targetPlaceholder.closest('.qubit-wire').dataset.qubitIndex);
            const timeStep = parseInt(targetPlaceholder.dataset.timeStep);

            const gateDiv = document.createElement('div');
            gateDiv.classList.add('gate-on-wire');
            gateDiv.textContent = gateType.startsWith('CNOT-') ? draggedGate.textContent.split(' ')[0] : gateType; // 簡化顯示
            gateDiv.dataset.gate = gateType;

            if (gateType.includes('CNOT-C')) gateDiv.classList.add('control-gate');
            if (gateType.includes('CNOT-T')) gateDiv.classList.add('target-gate');


            // 雙擊移除閘
            gateDiv.addEventListener('dblclick', () => {
                targetPlaceholder.innerHTML = ''; // 清空 placeholder
                circuit[qubitIndex][timeStep] = null;
                console.log(`Gate removed from Qubit ${qubitIndex}, Time ${timeStep}`);
                updateProbabilityDisplay(circuit.length); // 更新機率 (示意)
            });

            targetPlaceholder.appendChild(gateDiv);
            circuit[qubitIndex][timeStep] = gateType; // 更新電路狀態
            console.log(`Gate ${gateType} dropped on Qubit ${qubitIndex}, Time ${timeStep}`);
            updateProbabilityDisplay(circuit.length); // 更新機率 (示意)
        }
        draggedGate = null; // 清除拖動的閘
    }


    function updateProbabilityDisplay(numQubits, isReset = false) {
        probabilityDiv.innerHTML = ''; // 清空舊的機率

        if (isReset || !circuit.flat().some(gate => gate !== null)) { // 如果是重設或電路為空
            const numStates = Math.pow(2, numQubits);
            // 初始狀態 |00...0⟩ 的機率為 1
            for (let i = 0; i < numStates; i++) {
                const stateLabel = i.toString(2).padStart(numQubits, '0');
                const probP = document.createElement('p');
                if (i === 0) {
                    probP.textContent = `|${stateLabel}⟩: 1.0000`;
                } else {
                    probP.textContent = `|${stateLabel}⟩: 0.0000`;
                }
                probabilityDiv.appendChild(probP);
            }
            return;
        }

        // --- 簡化的偽機率計算 ---
        // 這裡的邏輯非常簡化，並不能真正代表量子計算的結果
        // 僅用於演示介面變化
        let hasHGate = false;
        let hasXGateOnQ0 = false;
        circuit.forEach((qubitLine, qIndex) => {
            qubitLine.forEach(gate => {
                if (gate === 'H') hasHGate = true;
                if (qIndex === 0 && gate === 'X') hasXGateOnQ0 = true;
            });
        });

        const numStates = Math.pow(2, numQubits);
        const probabilities = new Array(numStates).fill(0);

        if (hasHGate && numQubits > 0) {
            // 如果有H閘，假設一個簡單的均勻疊加 (不精確)
            const probValue = 1 / numStates;
            for (let i = 0; i < numStates; i++) {
                probabilities[i] = probValue;
            }
        } else if (hasXGateOnQ0 && numQubits > 0) {
            // 如果q0上有X閘，則|10...0⟩ 機率為1 (假設其他都是0開始)
            const stateIndexOfXOnQ0 = 1 << (numQubits - 1);
            probabilities[stateIndexOfXOnQ0] = 1.0;
        }
        else {
            // 預設 |00...0⟩ 機率為 1
            probabilities[0] = 1.0;
        }


        for (let i = 0; i < numStates; i++) {
            const stateLabel = i.toString(2).padStart(numQubits, '0');
            const probP = document.createElement('p');
            probP.textContent = `|${stateLabel}⟩: ${probabilities[i].toFixed(4)}`;
            probabilityDiv.appendChild(probP);
        }
        // --- 偽機率計算結束 ---
    }


    generateCircuitBtn.addEventListener('click', () => {
        const count = parseInt(qubitCountInput.value);
        if (count >= 2 && count <= 6) {
            initializeCircuit(count);
        } else {
            alert('Qubit 數量必須在 2 到 6 之間。');
        }
    });

    runSimulationBtn.addEventListener('click', () => {
        if (circuit.length > 0) {
            alert('執行模擬 (示意)。實際的量子計算將在此處觸發，並更新下方的機率。');
            // 在真實應用中，這裡會收集 circuit 數據，發送到後端或 WebAssembly 模擬器
            // 然後用返回的結果更新 updateProbabilityDisplay
            // 為了演示，我們再次調用 updateProbabilityDisplay，它內部的偽邏輯會根據電路改變輸出
            updateProbabilityDisplay(circuit.length);
            console.log("Current circuit state:", circuit);
        }
    });

    // 初始化3個量子位元的電路
    qubitCountInput.value = 3;
    initializeCircuit(3);
});