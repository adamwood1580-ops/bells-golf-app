const STORAGE_KEY = "bells-fourbbb-round";

const course = BELLS_COURSE;

const teeSelect = document.getElementById("teeSelect");
const roundDateInput = document.getElementById("roundDate");

const playerANameInput = document.getElementById("playerAName");
const playerBNameInput = document.getElementById("playerBName");
const playerAIndexInput = document.getElementById("playerAIndex");
const playerBIndexInput = document.getElementById("playerBIndex");

const playerAPlayingDisplay = document.getElementById("playerAPlaying");
const playerBPlayingDisplay = document.getElementById("playerBPlaying");
const summaryAPlaying = document.getElementById("summaryAPlaying");
const summaryBPlaying = document.getElementById("summaryBPlaying");

const courseInfo = document.getElementById("courseInfo");

const frontNine = document.getElementById("frontNine");
const backNine = document.getElementById("backNine");

const outAPoints = document.getElementById("outAPoints");
const outBPoints = document.getElementById("outBPoints");
const outBestPoints = document.getElementById("outBestPoints");

const inAPoints = document.getElementById("inAPoints");
const inBPoints = document.getElementById("inBPoints");
const inBestPoints = document.getElementById("inBestPoints");

const totalAPoints = document.getElementById("totalAPoints");
const totalBPoints = document.getElementById("totalBPoints");
const summaryOutBest = document.getElementById("summaryOutBest");
const summaryInBest = document.getElementById("summaryInBest");
const teamTotalPoints = document.getElementById("teamTotalPoints");

const resetRoundBtn = document.getElementById("resetRoundBtn");
const shareScorecardBtn = document.getElementById("shareScorecardBtn");

let selectedTee = null;
let playerAPlayingHandicap = 0;
let playerBPlayingHandicap = 0;

function initialiseApp() {
    populateTees();

    const savedRound = loadSavedRound();

    teeSelect.value = savedRound?.tee || "Yellow";
    selectedTee = course.tees[teeSelect.value];

    roundDateInput.value = savedRound?.roundDate || getTodayDate();
    playerANameInput.value = savedRound?.playerAName || "";
    playerBNameInput.value = savedRound?.playerBName || "";
    playerAIndexInput.value = savedRound?.playerAIndex || "";
    playerBIndexInput.value = savedRound?.playerBIndex || "";

    updateTeeColour();
    renderCourse();

    if (savedRound?.scores) {
        restoreScores(savedRound.scores);
    }

    updateHandicapsAndScores();

    teeSelect.addEventListener("change", handleTeeChange);
    roundDateInput.addEventListener("input", saveRound);
    playerANameInput.addEventListener("input", saveRound);
    playerBNameInput.addEventListener("input", saveRound);
    playerAIndexInput.addEventListener("input", handleDetailsChange);
    playerBIndexInput.addEventListener("input", handleDetailsChange);

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

    courseInfo.innerHTML = `
        <span>⚑ Par ${selectedTee.par}</span>
        <span>★ Course Rating ${selectedTee.rating}</span>
        <span>⌁ Slope ${selectedTee.slope}</span>
        <span>4BBB allowance: 85%</span>
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
            <input class="score-input player-a-score" type="number" min="1" inputmode="numeric" data-player="a" data-hole="${index}" />
            <div class="shot-marker" id="a-shot-${index}"></div>
        </td>
        <td>
            <input class="score-input player-b-score" type="number" min="1" inputmode="numeric" data-player="b" data-hole="${index}" />
            <div class="shot-marker" id="b-shot-${index}"></div>
        </td>
        <td id="best-${index}">-</td>
    `;

    return row;
}

function handleScoreInput(event) {
    calculateFourBBB();
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
    calculateFourBBB();
}

function updateHandicaps() {
    playerAPlayingHandicap = calculatePlayingHandicap(playerAIndexInput.value);
    playerBPlayingHandicap = calculatePlayingHandicap(playerBIndexInput.value);

    playerAPlayingDisplay.textContent = playerAPlayingHandicap || "-";
    playerBPlayingDisplay.textContent = playerBPlayingHandicap || "-";
    summaryAPlaying.textContent = playerAPlayingHandicap || "-";
    summaryBPlaying.textContent = playerBPlayingHandicap || "-";
}

function calculatePlayingHandicap(indexValue) {
    const handicapIndex = parseFloat(indexValue);

    if (isNaN(handicapIndex) || !selectedTee) {
        return 0;
    }

    const courseHandicap =
        (handicapIndex * selectedTee.slope / 113) +
        (selectedTee.rating - selectedTee.par);

    return Math.round(Math.round(courseHandicap) * 0.85);
}

function highlightShotHoles() {
    selectedTee.holes.forEach((_, index) => {
        const aShotMarker = document.getElementById(`a-shot-${index}`);
        const bShotMarker = document.getElementById(`b-shot-${index}`);

        const aShots = getShotsReceived(playerAPlayingHandicap, selectedTee.si[index]);
        const bShots = getShotsReceived(playerBPlayingHandicap, selectedTee.si[index]);

        if (aShotMarker) {
            aShotMarker.textContent = aShots ? `+${aShots}` : "";
        }

        if (bShotMarker) {
            bShotMarker.textContent = bShots ? `+${bShots}` : "";
        }
    });
}

function calculateFourBBB() {
    let outATotal = 0;
    let outBTotal = 0;
    let outBestTotal = 0;

    let inATotal = 0;
    let inBTotal = 0;
    let inBestTotal = 0;

    selectedTee.holes.forEach((par, index) => {
        const aInput = document.querySelector(`.player-a-score[data-hole="${index}"]`);
        const bInput = document.querySelector(`.player-b-score[data-hole="${index}"]`);
        const bestCell = document.getElementById(`best-${index}`);

        const aGross = parseInt(aInput?.value, 10);
        const bGross = parseInt(bInput?.value, 10);

        const aPoints = aGross
            ? getStablefordPoints(
                aGross - getShotsReceived(playerAPlayingHandicap, selectedTee.si[index]),
                par
            )
            : 0;

        const bPoints = bGross
            ? getStablefordPoints(
                bGross - getShotsReceived(playerBPlayingHandicap, selectedTee.si[index]),
                par
            )
            : 0;

        const bestPoints = Math.max(aPoints, bPoints);

        bestCell.textContent = bestPoints || "-";

        if (index < 9) {
            outATotal += aPoints;
            outBTotal += bPoints;
            outBestTotal += bestPoints;
        } else {
            inATotal += aPoints;
            inBTotal += bPoints;
            inBestTotal += bestPoints;
        }
    });

    const aTotal = outATotal + inATotal;
    const bTotal = outBTotal + inBTotal;
    const teamTotal = outBestTotal + inBestTotal;

    outAPoints.textContent = outATotal || "-";
    outBPoints.textContent = outBTotal || "-";
    outBestPoints.textContent = outBestTotal || "-";

    inAPoints.textContent = inATotal || "-";
    inBPoints.textContent = inBTotal || "-";
    inBestPoints.textContent = inBestTotal || "-";

    totalAPoints.textContent = aTotal || "-";
    totalBPoints.textContent = bTotal || "-";
    summaryOutBest.textContent = outBestTotal || "-";
    summaryInBest.textContent = inBestTotal || "-";
    teamTotalPoints.textContent = teamTotal || "-";
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
        outAPoints, outBPoints, outBestPoints,
        inAPoints, inBPoints, inBestPoints,
        totalAPoints, totalBPoints,
        summaryOutBest, summaryInBest,
        teamTotalPoints
    ].forEach(el => el.textContent = "-");
}

function resetRound() {
    if (!confirm("Clear all scores for this round?")) return;

    document.querySelectorAll(".score-input").forEach(input => {
        input.value = "";
    });

    selectedTee.holes.forEach((_, index) => {
        const bestCell = document.getElementById(`best-${index}`);
        if (bestCell) bestCell.textContent = "-";
    });

    resetTotals();
    highlightShotHoles();
    saveRound();
}

function saveRound() {
    const scores = {};

    document.querySelectorAll(".score-input").forEach(input => {
        const key = `${input.dataset.player}-${input.dataset.hole}`;
        scores[key] = input.value;
    });

    const roundData = {
        tee: teeSelect.value,
        roundDate: roundDateInput.value,
        playerAName: playerANameInput.value,
        playerBName: playerBNameInput.value,
        playerAIndex: playerAIndexInput.value,
        playerBIndex: playerBIndexInput.value,
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
        const key = `${input.dataset.player}-${input.dataset.hole}`;

        if (scores[key]) {
            input.value = scores[key];
        }
    });
}

function buildShareCard() {
    document.getElementById("shareDate").textContent = roundDateInput.value || "-";
    document.getElementById("shareTee").textContent = teeSelect.value || "-";
    document.getElementById("sharePlayerA").textContent = playerANameInput.value || "Player A";
    document.getElementById("sharePlayerB").textContent = playerBNameInput.value || "Player B";
    document.getElementById("shareAPlaying").textContent = playerAPlayingHandicap || "-";
    document.getElementById("shareBPlaying").textContent = playerBPlayingHandicap || "-";

    const frontBody = document.querySelector("#shareFront tbody");
    const backBody = document.querySelector("#shareBack tbody");

    frontBody.innerHTML = "";
    backBody.innerHTML = "";

    let totalA = 0;
    let totalB = 0;
    let totalTeam = 0;

    selectedTee.holes.forEach((par, index) => {
        const aInput = document.querySelector(`.player-a-score[data-hole="${index}"]`);
        const bInput = document.querySelector(`.player-b-score[data-hole="${index}"]`);

        const aGross = parseInt(aInput?.value, 10);
        const bGross = parseInt(bInput?.value, 10);

        const aPoints = aGross
            ? getStablefordPoints(
                aGross - getShotsReceived(playerAPlayingHandicap, selectedTee.si[index]),
                par
            )
            : 0;

        const bPoints = bGross
            ? getStablefordPoints(
                bGross - getShotsReceived(playerBPlayingHandicap, selectedTee.si[index]),
                par
            )
            : 0;

        const bestPoints = Math.max(aPoints, bPoints);

        totalA += aPoints;
        totalB += bPoints;
        totalTeam += bestPoints;

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${selectedTee.yards[index]}</td>
                <td>${par}</td>
                <td>${selectedTee.si[index]}</td>
                <td>${aPoints || "-"}</td>
                <td>${bPoints || "-"}</td>
                <td>${bestPoints || "-"}</td>
            </tr>
        `;

        if (index < 9) {
            frontBody.insertAdjacentHTML("beforeend", row);
        } else {
            backBody.insertAdjacentHTML("beforeend", row);
        }
    });

    document.getElementById("shareTotalA").textContent = totalA || "-";
    document.getElementById("shareTotalB").textContent = totalB || "-";
    document.getElementById("shareTeamTotal").textContent = totalTeam || "-";
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

            const file = new File([blob], "bells-fourbbb-scorecard.png", {
                type: "image/png"
            });

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: "Bells 4BBB Scorecard",
                    text: "My 4BBB scorecard",
                    files: [file]
                });
            } else {
                const link = document.createElement("a");
                link.download = "bells-fourbbb-scorecard.png";
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