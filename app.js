"use strict";

(() => {
  const teamsEl = document.getElementById("teams");
  const seedEl = document.getElementById("seed");
  const alternativesEl = document.getElementById("alternatives");
  const msg = document.getElementById("message");
  const results = document.getElementById("results");
  const example8 = ["SchoolA_1","SchoolA_2","SchoolB_1","SchoolB_2","SchoolC_1","SchoolD_1","SchoolE_1","SchoolF_1"];
  const example10 = [...example8,"SchoolG_1","SchoolH_1"];

  function defaultMatrixId() {
    const eventYear = new Date().getFullYear() + 1;
    return `SYPT-${eventYear}`;
  }

  seedEl.value = defaultMatrixId();

  function teamCount() { return Number(document.querySelector('input[name="teamCount"]:checked').value); }
  function teams() { return teamsEl.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

  document.querySelectorAll('input[name="teamCount"]').forEach(radio => radio.addEventListener("change", () => {
    const current = teams();
    if (current.join("\n") === example8.join("\n") || current.join("\n") === example10.join("\n")) teamsEl.value = (teamCount() === 8 ? example8 : example10).join("\n");
    results.innerHTML = ""; msg.textContent = "";
  }));

  document.getElementById("generate").addEventListener("click", () => {
    const list = teams();
    const errors = SYPTMatrix.validateTeams(list, teamCount());
    results.innerHTML = "";
    if (errors.length) { msg.className = "message error"; msg.innerHTML = errors.map(esc).join("<br>"); return; }
    const baseSeed = seedEl.value.trim() || defaultMatrixId();
    seedEl.value = baseSeed;
    const wanted = Number(alternativesEl.value);
    const generated = SYPTMatrix.generateAlternatives(list, baseSeed, wanted);
    if (!generated.length) {
      msg.className = "message error";
      msg.textContent = "No valid matrix was found. Check the team/school combination or change the seed and try again.";
      return;
    }
    msg.className = generated.length === wanted ? "message ok" : "message error";
    msg.textContent = generated.length === wanted ? `${generated.length} valid matrix option(s) generated.` : `Only ${generated.length} distinct valid matrix option(s) were found.`;
    generated.forEach((g, i) => results.appendChild(renderMatrix(g, i + 1)));
  });

  document.getElementById("print").addEventListener("click", () => window.print());

  function renderMatrix(g, number) {
    const section = document.createElement("section"); section.className = "card";
    const heading = document.createElement("div"); heading.className = "matrix-head";
    heading.innerHTML = `<h2>Matrix ${number}</h2><span class="badge">✓ VALID MATRIX</span>`; section.appendChild(heading);
    const id = document.createElement("p"); id.innerHTML = `<strong>Matrix ID:</strong> ${esc(g.seed)}`; section.appendChild(id);

    const sequenceWrap = document.createElement("div"); sequenceWrap.className = "table-wrap";
    let sequenceHtml = "<h3>Team role sequences</h3><table><thead><tr><th>Team</th><th>Sequence</th></tr></thead><tbody>";
    Object.entries(g.sequences).sort(([a],[b]) => a.localeCompare(b)).forEach(([team, sequence]) => { sequenceHtml += `<tr><td>${esc(team)}</td><td><strong>${sequence}</strong></td></tr>`; });
    sequenceHtml += "</tbody></table>"; sequenceWrap.innerHTML = sequenceHtml; section.appendChild(sequenceWrap);

    const wrap = document.createElement("div"); wrap.className = "table-wrap";
    let html = "<h3>Fight matrix</h3><table><thead><tr><th>Round</th><th>Room</th><th>Reporter</th><th>Opponent</th></tr></thead><tbody>";
    g.matrix.forEach(f => { html += `<tr><td>${f.round}</td><td>${f.room}</td><td>${esc(f.reporter)}</td><td>${esc(f.opponent)}</td></tr>`; });
    html += "</tbody></table>"; wrap.innerHTML = html; section.appendChild(wrap);

    const val = document.createElement("div"); val.className = "validation";
    val.innerHTML = ["Every team follows RORO or OROR","Equal numbers assigned to each sequence","All teams appear once per round","No repeated pairings","No same-school encounters","All fights assigned"].map(x => `<span>✓ ${x}</span>`).join(""); section.appendChild(val);
    const actions = document.createElement("div"); actions.className = "matrix-actions";
    const button = document.createElement("button"); button.type = "button"; button.className = "secondary"; button.textContent = "Download CSV";
    button.addEventListener("click", () => downloadCSV(g.matrix, g.sequences, g.seed)); actions.appendChild(button); section.appendChild(actions);
    return section;
  }

  function downloadCSV(matrix, sequences, seed) {
    const rows = [["Round","Room","Reporter","Reporter Sequence","Opponent","Opponent Sequence"], ...matrix.map(f => [f.round,f.room,f.reporter,sequences[f.reporter],f.opponent,sequences[f.opponent]])];
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${seed}.csv`; document.body.appendChild(a); a.click(); URL.revokeObjectURL(a.href); a.remove();
  }
})();
