const STORAGE_KEY = "bells-strokeplay-round";

const course = BELLS_COURSE;

const teeSelect = document.getElementById("teeSelect");
const handicapIndexInput = document.getElementById("handicapIndex");
const playerNameInput = document.getElementById("playerName");
const roundDateInput = document.getElementById("roundDate");

const courseHandicapDisplay = document.getElementById("courseHandicap");
const playingHandicapDisplay = document.getElementById("playingHandicap");
const courseInfo = document.getElementById("courseInfo");

const frontNine = document.getElementById("frontNine");
const backNine = document.getElementById("backNine");

const outPar = document.getElementById("outPar");
const inPar = document.getElementById("inPar");
const outGross = document.getElementById("outGross");
const inGross = document.getElementById("inGross");

const outGrossSummary = document.getElementById("outGrossSummary");
const inGrossSummary = document.getElementById("inGrossSummary");
const totalGross = document.getElementById("totalGross");
const totalNett = document.getElementById("totalNett");

const resetRoundBtn = document.getElementById("resetRoundBtn");
const shareScorecardBtn = document.getElementById("shareScorecardBtn");

let selectedTee = null;
let currentCourseHandicap = 0;
let currentPlayingHandicap = 0;

function initialiseApp() {
    populateTees();

    const savedRound = loadSavedRound();

    teeSelect.value = savedRound?.tee || "Yellow";
    selectedTee = course.tees[teeSelect.value];

    handicapIndexInput.value = savedRound?.handicapIndex || "";
    playerNameInput.value = savedRound?.playerName || "";
    roundDateInput.value = savedRound?.roundDate || getTodayDate();

    updateTeeColour();
    renderCourse();

    if (savedRound?.scores) {
        restoreScores(savedRound.scores);
    }

    updateHandicapsAndScores();

    teeSelect.addEventListener("change", handleTeeChange);
    handicapIndexInput.addEventListener("input", handleDetailsChange);
    playerNameInput.addEventListener("input", saveRound);
    roundDateInput.addEventListener("input", saveRound);

    resetRoundBtn?.addEventListener("click", resetRound);
    shareScorecardBtn?.addEventListener("click", saveOrShareScorecard);
}

function populateTees() {
    Object.keys(course.tees).forEach(teeName => {
        teeSelect.add(new Option(teeName, teeName));
    });
}

function handleDetailsChange() {
    updateHandicapsAndScores();
    saveRound();
}

function handleTeeChange() {
    selectedTee = course.tees[teeSelect.value];

    updateTeeColour();
    renderCourse();
    updateHandicapsAndScores();
    saveRound();
}

function updateTeeColour() {
    teeSelect.classList.remove("tee-white", "tee-yellow", "tee-red");
    teeSelect.classList.add(`tee-${teeSelect.value.toLowerCase()}`);
}

function renderCourse() {
    frontNine.innerHTML = "";
    backNine.innerHTML = "";

    selectedTee.holes.forEach((_, index) => {
        const row = createHoleRow(index);
        index < 9 ? frontNine.appendChild(row) : backNine.appendChild(row);
    });

    document.querySelectorAll(".score-input").forEach(input => {
        input.addEventListener("input", handleScoreInput);
        input.addEventListener("focus", event => event.target.select());
    });

    outPar.textContent = selectedTee.holes.slice(0, 9).reduce((a, b) => a + b, 0);
    inPar.textContent = selectedTee.holes.slice(9).reduce((a, b) => a + b, 0);

    courseInfo.innerHTML = `
        <span>⚑ Par ${selectedTee.par}</span>
        <span>★ Course Rating ${selectedTee.rating}</span>
        <span>⌁ Slope ${selectedTee.slope}</span>
    `;

    resetTotals();
}

function createHoleRow(index) {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${index + 1}</td>
        <td>${selectedTee.yards[index]}</td>
        <td>${selectedTee.holes[index]}</td>
        <td class="si">${selectedTee.si[index]}</td>
        <td>
            <input class="score-input" type="number" min="1" inputmode="numeric" data-hole="${index}" />
        </td>
    `;

    return row;
}

function handleScoreInput(event) {
    calculateStrokePlay();
    saveRound();

    const input = event.target;

    if (input.value.length >= 1 && Number(input.value) > 0) {
        moveToNextScoreInput(input);
    }
}

function moveToNextScoreInput(currentInput) {
    const inputs = Array.from(document.querySelectorAll(".score-input"));
    const currentIndex = inputs.indexOf(currentInput);

    if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
        setTimeout(() => inputs[currentIndex + 1].focus(), 80);
    }
}

function updateHandicapsAndScores() {
    updateHandicaps();
    calculateStrokePlay();
}

function updateHandicaps() {
    const handicapIndex = parseFloat(handicapIndexInput.value);

    if (!selectedTee || isNaN(handicapIndex)) {
        currentCourseHandicap = 0;
        currentPlayingHandicap = 0;
        courseHandicapDisplay.textContent = "-";
        playingHandicapDisplay.textContent = "-";
        return;
    }

    const rawCourseHandicap =
        (handicapIndex * selectedTee.slope / 113) +
        (selectedTee.rating - selectedTee.par);

    currentCourseHandicap = Math.round(rawCourseHandicap);
    currentPlayingHandicap = currentCourseHandicap;

    courseHandicapDisplay.textContent = currentCourseHandicap;
    playingHandicapDisplay.textContent = currentPlayingHandicap;
}

function calculateStrokePlay() {
    let outGrossTotal = 0;
    let inGrossTotal = 0;

    document.querySelectorAll(".score-input").forEach(input => {
        const holeIndex = Number(input.dataset.hole);
        const gross = parseInt(input.value, 10);

        if (!gross) return;

        if (holeIndex < 9) {
            outGrossTotal += gross;
        } else {
            inGrossTotal += gross;
        }
    });

    const grossTotal = outGrossTotal + inGrossTotal;
    const nettTotal = grossTotal ? grossTotal - currentPlayingHandicap : 0;

    outGross.textContent = outGrossTotal || "-";
    inGross.textContent = inGrossTotal || "-";

    outGrossSummary.textContent = outGrossTotal || "-";
    inGrossSummary.textContent = inGrossTotal || "-";

    totalGross.textContent = grossTotal || "-";
    totalNett.textContent = nettTotal || "-";
}

function resetTotals() {
    [
        outGross,
        inGross,
        outGrossSummary,
        inGrossSummary,
        totalGross,
        totalNett
    ].forEach(el => el.textContent = "-");
}

function resetRound() {
    if (!confirm("Clear all scores for this round?")) return;

    document.querySelectorAll(".score-input").forEach(input => {
        input.value = "";
    });

    resetTotals();
    saveRound();
}

function saveRound() {
    const scores = {};

    document.querySelectorAll(".score-input").forEach(input => {
        scores[input.dataset.hole] = input.value;
    });

    const roundData = {
        tee: teeSelect.value,
        handicapIndex: handicapIndexInput.value,
        playerName: playerNameInput.value,
        roundDate: roundDateInput.value,
        scores
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(roundData));
}

function loadSavedRound() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function restoreScores(scores) {
    document.querySelectorAll(".score-input").forEach(input => {
        const hole = input.dataset.hole;
        if (scores[hole]) input.value = scores[hole];
    });
}

function buildShareCard() {
    document.getElementById("sharePlayer").textContent = playerNameInput.value || "-";
    document.getElementById("shareDate").textContent = roundDateInput.value || "-";
    document.getElementById("shareTee").textContent = teeSelect.value || "-";
    document.getElementById("shareHI").textContent = handicapIndexInput.value || "-";
    document.getElementById("shareCH").textContent = currentCourseHandicap || "-";
    document.getElementById("sharePH").textContent = currentPlayingHandicap || "-";

    const frontBody = document.querySelector("#shareFront tbody");
    const backBody = document.querySelector("#shareBack tbody");

    frontBody.innerHTML = "";
    backBody.innerHTML = "";

    let grossTotal = 0;

    document.querySelectorAll(".score-input").forEach(input => {
        const hole = Number(input.dataset.hole);
        const gross = Number(input.value || 0);
        const par = selectedTee.holes[hole];
        const yards = selectedTee.yards[hole];
        const si = selectedTee.si[hole];

        if (gross) {
            grossTotal += gross;
        }

        const row = `
            <tr>
                <td>${hole + 1}</td>
                <td>${yards}</td>
                <td>${par}</td>
                <td>${si}</td>
                <td>${gross || "-"}</td>
            </tr>
        `;

        if (hole < 9) {
            frontBody.insertAdjacentHTML("beforeend", row);
        } else {
            backBody.insertAdjacentHTML("beforeend", row);
        }
    });

    document.getElementById("shareGross").textContent = grossTotal || "-";
    document.getElementById("sharePlayingHandicap").textContent = currentPlayingHandicap || "-";
    document.getElementById("shareNett").textContent =
        grossTotal ? grossTotal - currentPlayingHandicap : "-";
}

async function saveOrShareScorecard() {
    const shareCard = document.getElementById("shareCard");

    if (!shareCard || typeof html2canvas === "undefined") {
        alert("Sharing tool is still loading. Please try again.");
        return;
    }

    buildShareCard();

    shareScorecardBtn.textContent = "Preparing...";
    shareScorecardBtn.disabled = true;

    shareCard.classList.add("share-card-exporting");

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
        const canvas = await html2canvas(shareCard, {
            backgroundColor: "#fbf8ee",
            scale: 2,
            useCORS: true,
            width: 1200,
            windowWidth: 1200
        });

        canvas.toBlob(async blob => {
            if (!blob) throw new Error("Image could not be created.");

            const file = new File([blob], "bells-strokeplay-scorecard.png", {
                type: "image/png"
            });

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: "Bells Stroke Play Scorecard",
                    text: "My stroke play scorecard",
                    files: [file]
                });
            } else {
                const link = document.createElement("a");
                link.download = "bells-strokeplay-scorecard.png";
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }, "image/png");
    } catch (error) {
        console.error(error);
        alert("Unable to create scorecard image.");
    } finally {
        shareCard.classList.remove("share-card-exporting");
        shareScorecardBtn.textContent = "Save / Share Scorecard";
        shareScorecardBtn.disabled = false;
    }
}

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

initialiseApp();
