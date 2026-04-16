const CalculatorApp = (() => {
    const state = {
        expression: "",
        history: [],
        isHistoryVisible: true,
        theme: "dark",
        soundEnabled: true,
        operators: new Set(["+", "-", "*", "/", "%"]),
        maxHistory: 12,
        audioContext: null,
    };

    const elements = {
        display: null,
        preview: null,
        buttons: null,
        historyList: null,
        historyContent: null,
        themeToggle: null,
        themeModeLabel: null,
        soundToggle: null,
        clearHistory: null,
        historyToggle: null,
    };

    function init() {
        document.addEventListener("DOMContentLoaded", onDomReady);
    }

    function onDomReady() {
        bindElements();
        bindEvents();
        loadTheme();
        render();
    }

    function bindElements() {
        elements.display = document.querySelector("#display");
        elements.preview = document.querySelector("#preview-display");
        elements.buttons = Array.from(document.querySelectorAll(".buttons-grid .button"));
        elements.historyList = document.querySelector("#history-list");
        elements.historyContent = document.querySelector("#history-content");
        elements.themeToggle = document.querySelector("#theme-toggle");
        elements.themeModeLabel = document.querySelector("#theme-mode-label");
        elements.soundToggle = document.querySelector("#sound-toggle");
        elements.clearHistory = document.querySelector("#clear-history");
        elements.historyToggle = document.querySelector("#history-toggle");
    }

    function bindEvents() {
        elements.buttons.forEach((button) => {
            button.addEventListener("click", handleButtonClick);
        });

        window.addEventListener("keydown", handleKeyboardInput);
        elements.themeToggle.addEventListener("click", toggleTheme);
        elements.soundToggle.addEventListener("click", toggleSound);
        elements.clearHistory.addEventListener("click", clearHistory);
        elements.historyToggle.addEventListener("click", toggleHistoryVisibility);
        elements.historyList.addEventListener("click", handleHistoryClick);
    }

    function handleButtonClick(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        const value = button.dataset.value;

        playClickSound();

        if (action === "clear") {
            clearExpression();
            return;
        }

        if (action === "delete") {
            deleteLastCharacter();
            return;
        }

        if (action === "equals") {
            computeResult();
            return;
        }

        if (value) {
            appendCharacter(value);
        }
    }

    function handleKeyboardInput(event) {
        const { key } = event;
        const normalizedKey = key.toLowerCase();

        if (/^[0-9]$/.test(key)) {
            appendCharacter(key);
            playClickSound();
            return;
        }

        if (state.operators.has(key)) {
            appendCharacter(key);
            playClickSound();
            return;
        }

        if (key === ".") {
            appendCharacter(key);
            playClickSound();
            return;
        }

        if (key === "Enter" || key === "=") {
            event.preventDefault();
            computeResult();
            playClickSound();
            return;
        }

        if (key === "Backspace") {
            deleteLastCharacter();
            playClickSound();
            return;
        }

        if (normalizedKey === "c") {
            clearExpression();
            playClickSound();
            return;
        }
    }

    function appendCharacter(character) {
        const lastChar = state.expression.slice(-1);

        if (character === ".") {
            if (hasDecimalInCurrentNumber()) {
                return;
            }

            if (state.expression === "" || state.operators.has(lastChar)) {
                state.expression += "0.";
                render();
                return;
            }
        }

        if (state.operators.has(character)) {
            if (state.expression === "" && character !== "-") {
                return;
            }

            if (state.operators.has(lastChar)) {
                state.expression = state.expression.slice(0, -1) + character;
                render();
                return;
            }

            if (lastChar === ".") {
                return;
            }
        }

        state.expression += character;
        render();
    }

    function hasDecimalInCurrentNumber() {
        const tokens = tokenizeExpression(state.expression);
        const lastToken = tokens[tokens.length - 1] || "";
        return lastToken.includes(".");
    }

    function clearExpression() {
        state.expression = "";
        render();
    }

    function deleteLastCharacter() {
        state.expression = state.expression.slice(0, -1);
        render();
    }

    function computeResult() {
        if (!state.expression) {
            return;
        }

        try {
            const result = evaluateExpression(state.expression);
            if (!Number.isFinite(result)) {
                throw new Error("Invalid result");
            }

            const formattedResult = formatResult(result);
            addHistoryEntry(state.expression, formattedResult);
            state.expression = String(formattedResult);
            render();
        } catch (error) {
            state.expression = "";
            elements.display.value = "Error";
            elements.preview.textContent = "Invalid calculation";
        }
    }

    function addHistoryEntry(expression, result) {
        state.history.unshift({ expression, result });
        if (state.history.length > state.maxHistory) {
            state.history.pop();
        }
        renderHistory();
        console.log(state.history);
    }

    function render() {
        updateDisplay();
        updatePreview();
        renderHistory();
        updateOperatorHighlight();
    }

    function updateDisplay() {
        elements.display.value = state.expression || "0";
    }

    function updatePreview() {
        if (!state.expression) {
            elements.preview.textContent = "Ready to calculate";
            return;
        }

        const lastChar = state.expression.slice(-1);
        if (state.operators.has(lastChar) || state.expression.endsWith(".")) {
            elements.preview.textContent = "Complete the expression";
            return;
        }

        try {
            const previewValue = evaluateExpression(state.expression);
            elements.preview.textContent = `= ${formatResult(previewValue)}`;
        } catch {
            elements.preview.textContent = "Invalid expression";
        }
    }

    function renderHistory() {
        if (state.history.length === 0) {
            elements.historyList.innerHTML = '<li class="history-empty">No history yet</li>';
            return;
        }

        elements.historyList.innerHTML = state.history
            .map((entry) => {
                return `
                    <li class="history-item" data-expression="${entry.expression}">
                        <span class="history-expression">${entry.expression}</span>
                        <span class="history-result">= ${entry.result}</span>
                    </li>
                `;
            })
            .join("");
    }

    function handleHistoryClick(event) {
        const item = event.target.closest(".history-item");
        if (!item) {
            return;
        }

        state.expression = item.dataset.expression;
        render();
    }

    function toggleTheme() {
        state.theme = state.theme === "dark" ? "light" : "dark";
        applyTheme();
        localStorage.setItem("calculatorTheme", state.theme);
    }

    function toggleSound() {
        state.soundEnabled = !state.soundEnabled;
        elements.soundToggle.textContent = state.soundEnabled ? "🔊" : "🔇";
        elements.soundToggle.setAttribute("aria-label", state.soundEnabled ? "Sound on" : "Sound off");
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem("calculatorTheme");
        state.theme = savedTheme === "light" ? "light" : "dark";
        applyTheme();
    }

    function applyTheme() {
        document.body.classList.toggle("light-theme", state.theme === "light");
        elements.themeToggle.textContent = state.theme === "light" ? "🌞" : "🌙";
        elements.themeModeLabel.textContent = `Theme: ${state.theme === "light" ? "Light" : "Dark"}`;
    }

    function toggleHistoryVisibility() {
        state.isHistoryVisible = !state.isHistoryVisible;
        elements.historyContent.style.display = state.isHistoryVisible ? "block" : "none";
        elements.historyToggle.textContent = state.isHistoryVisible ? "Hide" : "Show";
    }

    function clearHistory() {
        state.history = [];
        renderHistory();
    }

    function playClickSound() {
        if (!state.soundEnabled) {
            return;
        }

        try {
            if (!state.audioContext) {
                state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (state.audioContext.state === "suspended") {
                state.audioContext.resume();
            }

            const oscillator = state.audioContext.createOscillator();
            const gain = state.audioContext.createGain();
            oscillator.connect(gain);
            gain.connect(state.audioContext.destination);
            oscillator.frequency.value = 440;
            gain.gain.value = 0.08;
            oscillator.start();
            oscillator.stop(state.audioContext.currentTime + 0.05);
        } catch (error) {
            // Audio not supported or blocked, silently ignore.
        }
    }

    function tokenizeExpression(expr) {
        const tokens = [];
        let current = "";

        for (let i = 0; i < expr.length; i += 1) {
            const char = expr[i];

            if (char === " ") {
                continue;
            }

            if (state.operators.has(char)) {
                if (current !== "") {
                    tokens.push(current);
                    current = "";
                }

                const previous = tokens[tokens.length - 1];
                const isUnaryMinus = char === "-" && (tokens.length === 0 || state.operators.has(previous));
                if (isUnaryMinus) {
                    current = "-";
                } else {
                    tokens.push(char);
                }
                continue;
            }

            current += char;
        }

        if (current !== "") {
            tokens.push(current);
        }

        return tokens;
    }

    function evaluateExpression(expr) {
        const tokens = tokenizeExpression(expr);
        const rpn = convertToRpn(tokens);
        return evaluateRpn(rpn);
    }

    function convertToRpn(tokens) {
        const output = [];
        const operators = [];
        const precedence = { "%": 3, "/": 3, "*": 3, "+": 2, "-": 2 };

        tokens.forEach((token) => {
            if (state.operators.has(token)) {
                while (
                    operators.length > 0 &&
                    state.operators.has(operators[operators.length - 1]) &&
                    precedence[operators[operators.length - 1]] >= precedence[token]
                ) {
                    output.push(operators.pop());
                }
                operators.push(token);
            } else {
                output.push(token);
            }
        });

        while (operators.length > 0) {
            output.push(operators.pop());
        }

        return output;
    }

    function evaluateRpn(rpn) {
        const stack = [];

        rpn.forEach((token) => {
            if (!state.operators.has(token)) {
                const value = Number(token);
                if (Number.isNaN(value)) {
                    throw new Error("Invalid number");
                }
                stack.push(value);
                return;
            }

            const right = stack.pop();
            const left = stack.pop();
            if (left === undefined || right === undefined) {
                throw new Error("Malformed expression");
            }

            let result;
            switch (token) {
                case "+":
                    result = left + right;
                    break;
                case "-":
                    result = left - right;
                    break;
                case "*":
                    result = left * right;
                    break;
                case "/":
                    if (right === 0) {
                        throw new Error("Divide by zero");
                    }
                    result = left / right;
                    break;
                case "%":
                    if (right === 0) {
                        throw new Error("Divide by zero");
                    }
                    result = left % right;
                    break;
                default:
                    throw new Error("Unsupported operator");
            }
            stack.push(result);
        });

        if (stack.length !== 1) {
            throw new Error("Invalid expression");
        }

        return stack[0];
    }

    function formatResult(value) {
        if (Number.isInteger(value)) {
            return String(value);
        }
        return String(Number(value.toFixed(10)));
    }

    function updateOperatorHighlight() {
        const lastChar = state.expression.slice(-1);
        elements.buttons.forEach((button) => {
            if (button.classList.contains("operator-button")) {
                button.classList.toggle("active", button.dataset.value === lastChar);
            }
        });
    }

    return {
        init,
    };
})();

CalculatorApp.init();