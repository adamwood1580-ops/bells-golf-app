const STORAGE_KEY = "bells-stableford-round";

const course = {
    name: "Bells Hotel and Country Club",
    tees: {
        White: {
            slope: 125,
            rating: 68.3,
            par: 69,
            holes: [4,3,4,4,3,4,5,3,4,4,4,4,5,4,3,4,3,4],
            si: [8,18,6,4,14,2,10,12,16,3,13,1,7,17,15,5,11,9],
            yards: [377,134,393,399,157,362,518,174,316,385,335,359,546,288,147,381,203,369]
        },
        Yellow: {
            slope: 123,
            rating: 66.5,
            par: 69,
            holes: [4,3,4,4,3,4,5,3,4,4,4,4,5,4,3,4,3,4],
            si: [8,18,6,4,14,2,10,12,16,3,13,1,7,17,15,5,11,9],
            yards: [363,126,298,399,152,350,512,144,300,354,318,329,497,280,138,363,203,336]
        },
        Red: {
            slope: 122,
            rating: 70.3,
            par: 71,
            holes: [4,3,4,4,3,5,5,3,4,5,4,4,5,4,3,4,3,4],
            si: [7,15,11,3,17,5,1,13,9,8,16,2,6,14,18,4,10,12],
            yards: [363,131,303,347,127,358,455,140,292,317,281,299,479,250,138,371,198,369]
        }
    }
};

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
const outNett = document.getElementById("outNett");
const inNett = document.getElementById("inNett");
const outPoints = document.getElementById("outPoints");
const inPoints = document.getElementById("inPoints");

const outGrossSummary = document.getElementById("outGrossSummary");
const inGrossSummary = document.getElementById("inGrossSummary");
const totalGross = document.getElementById("totalGross");
const totalNett = document.getElementById("totalNett");

const summaryOut = document.getElementById("summaryOut");
const summaryIn = document.getElementById("summaryIn");
const totalPoints = document.getElementById("totalPoints");

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
    highlightShotHoles();
}

function createHoleRow(index) {
    const row = document.createElement("tr");
    row.id = `hole-row-${index}`;

    row.innerHTML = `
        <td>${index + 1}</td>
        <td>${selectedTee.yards[index]}</td>
        <td>${selectedTee.holes[index]}</td>
        <td class="si">${selectedTee.si[index]}</td>
        <td>
            <input class="score-input" type="number" min="1" inputmode="numeric" data-hole="${index}" />
        </td>
        <td id="nett-${index}">-</td>
        <td id="points-${index}">-</td>
    `;

    return row;
}

function handleScoreInput(event) {
    calculateStableford();
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
    highlightShotHoles();
    calculateStableford();
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
    currentPlayingHandicap = Math.round(currentCourseHandicap * 0.95);

    courseHandicapDisplay.textContent = currentCourseHandicap;
    playingHandicapDisplay.textContent = currentPlayingHandicap;
}

function highlightShotHoles() {
    document.querySelectorAll(".shot-marker").forEach(marker => marker.remove());

    selectedTee.holes.forEach((_, index) => {
        const row = document.getElementById(`hole-row-${index}`);
        if (!row) return;

        const shots = getShotsReceived(currentPlayingHandicap, selectedTee.si[index]);

        row.classList.remove("shot-hole", "double-shot-hole");

        if (shots <= 0) return;

        row.classList.add(shots > 1 ? "double-shot-hole" : "shot-hole");

        const marker = document.createElement("div");
        marker.className = "shot-marker";
        marker.textContent = `+${shots}`;

        row.children[4].appendChild(marker);
    });
}

function calculateStableford() {
    let outGrossTotal = 0;
    let inGrossTotal = 0;
    let outNettTotal = 0;
    let inNettTotal = 0;
    let outPointsTotal = 0;
    let inPointsTotal = 0;

    document.querySelectorAll(".score-input").forEach(input => {
        const holeIndex = Number(input.dataset.hole);
        const gross = parseInt(input.value, 10);

        const nettCell = document.getElementById(`nett-${holeIndex}`);
        const pointsCell = document.getElementById(`points-${holeIndex}`);

        if (!gross) {
            nettCell.textContent = "-";
            pointsCell.textContent = "-";
            return;
        }

        const shots = getShotsReceived(currentPlayingHandicap, selectedTee.si[holeIndex]);
        const nett = gross - shots;
        const points = getStablefordPoints(nett, selectedTee.holes[holeIndex]);

        nettCell.textContent = nett;
        pointsCell.textContent = points;

        if (holeIndex < 9) {
            outGrossTotal += gross;
            outNettTotal += nett;
            outPointsTotal += points;
        } else {
            inGrossTotal += gross;
            inNettTotal += nett;
            inPointsTotal += points;
        }
    });

    const grossTotal = outGrossTotal + inGrossTotal;
    const nettTotal = outNettTotal + inNettTotal;
    const pointsTotal = outPointsTotal + inPointsTotal;

    outGross.textContent = outGrossTotal || "-";
    inGross.textContent = inGrossTotal || "-";
    outNett.textContent = outNettTotal || "-";
    inNett.textContent = inNettTotal || "-";
    outPoints.textContent = outPointsTotal || "-";
    inPoints.textContent = inPointsTotal || "-";

    outGrossSummary.textContent = outGrossTotal || "-";
    inGrossSummary.textContent = inGrossTotal || "-";
    summaryOut.textContent = outPointsTotal || "-";
    summaryIn.textContent = inPointsTotal || "-";

    totalGross.textContent = grossTotal || "-";
    totalNett.textContent = nettTotal || "-";
    totalPoints.textContent = pointsTotal || "-";
}

function getShotsReceived(playingHandicap, strokeIndex) {
    if (playingHandicap <= 0) return 0;

    const baseShots = Math.floor(playingHandicap / 18);
    const extraShots = playingHandicap % 18;

    return strokeIndex <= extraShots ? baseShots + 1 : baseShots;
}

function getStablefordPoints(nett, par) {
    const difference = nett - par;

    if (difference <= -3) return 5;
    if (difference === -2) return 4;
    if (difference === -1) return 3;
    if (difference === 0) return 2;
    if (difference === 1) return 1;

    return 0;
}

function resetTotals() {
    [
        outGross, inGross, outNett, inNett, outPoints, inPoints,
        outGrossSummary, inGrossSummary, summaryOut, summaryIn,
        totalGross, totalNett, totalPoints
    ].forEach(el => el.textContent = "-");
}

function resetRound() {
    if (!confirm("Clear all scores for this round?")) return;

    document.querySelectorAll(".score-input").forEach(input => {
        input.value = "";
    });

    document.querySelectorAll('[id^="nett-"], [id^="points-"]').forEach(cell => {
        cell.textContent = "-";
    });

    resetTotals();
    highlightShotHoles();
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
    let nettTotal = 0;
    let pointsTotal = 0;

    document.querySelectorAll(".score-input").forEach(input => {
        const hole = Number(input.dataset.hole);
        const gross = Number(input.value || 0);
        const par = selectedTee.holes[hole];
        const yards = selectedTee.yards[hole];
        const si = selectedTee.si[hole];
        const shots = getShotsReceived(currentPlayingHandicap, si);
        const nett = gross ? gross - shots : 0;
        const points = gross ? getStablefordPoints(nett, par) : 0;

        if (gross) {
            grossTotal += gross;
            nettTotal += nett;
            pointsTotal += points;
        }

        const row = `
            <tr>
                <td>${hole + 1}</td>
                <td>${yards}</td>
                <td>${par}</td>
                <td>${si}</td>
                <td>${gross || "-"}</td>
                <td>${gross ? points : "-"}</td>
            </tr>
        `;

        if (hole < 9) {
            frontBody.insertAdjacentHTML("beforeend", row);
        } else {
            backBody.insertAdjacentHTML("beforeend", row);
        }
    });

    document.getElementById("shareGross").textContent = grossTotal || "-";
    document.getElementById("shareNett").textContent = nettTotal || "-";
    document.getElementById("sharePoints").textContent = pointsTotal || "-";
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

            const file = new File([blob], "bells-stableford-scorecard.png", {
                type: "image/png"
            });

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: "Bells Stableford Scorecard",
                    text: "My Stableford scorecard",
                    files: [file]
                });
            } else {
                const link = document.createElement("a");
                link.download = "bells-stableford-scorecard.png";
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
