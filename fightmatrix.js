"use strict";

const SYPTMatrix = (() => {
  const ROUNDS = 4;

  function schoolOf(team) {
    const i = team.lastIndexOf("_");
    return i > 0 ? team.slice(0, i).trim().toLowerCase() : "";
  }

  function validateTeams(teams, expected) {
    const errors = [];
    if (teams.length !== expected) errors.push(`Enter exactly ${expected} teams.`);
    if (new Set(teams.map(t => t.toLowerCase())).size !== teams.length) errors.push("Team identifiers must be unique.");
    const pattern = /^.+_[1-9]\d*$/;
    teams.forEach(t => { if (!pattern.test(t)) errors.push(`Invalid team identifier: ${t}. Use school_teamnumber, e.g. HCI_1.`); });
    const counts = new Map();
    teams.forEach(t => { const s = schoolOf(t); counts.set(s, (counts.get(s) || 0) + 1); });
    counts.forEach((n, s) => { if (n > 2) errors.push(`School ${s} has ${n} teams; maximum is 2.`); });
    return [...new Set(errors)];
  }

  function hashSeed(text) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function rng(seedText) {
    let a = hashSeed(seedText) || 1;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(items, random) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function pairKey(a, b) { return [a, b].sort().join("||"); }
  function roleFor(sequence, round) { return sequence.charAt(round - 1); }

  // Half the teams are assigned RORO and half OROR. Each round then pairs
  // a required Reporter with a required Opponent using randomized backtracking.
  function generate(teams, seedText) {
    const random = rng(seedText);
    const ordered = shuffled(teams, random);
    const sequences = {};
    ordered.forEach((team, i) => { sequences[team] = i < teams.length / 2 ? "RORO" : "OROR"; });
    const met = new Set();
    const schedule = [];

    function solveRound(round) {
      if (round > ROUNDS) return true;
      const reporters = teams.filter(t => roleFor(sequences[t], round) === "R");
      const opponents = new Set(teams.filter(t => roleFor(sequences[t], round) === "O"));
      const fights = [];

      function assignReporter(remainingReporters) {
        if (remainingReporters.length === 0) {
          const roomOrder = shuffled(fights, random);
          schedule.push(...roomOrder.map((f, i) => ({ round, room: i + 1, ...f })));
          if (solveRound(round + 1)) return true;
          schedule.splice(schedule.length - roomOrder.length, roomOrder.length);
          return false;
        }

        const constrained = shuffled(remainingReporters, random).map(reporter => ({
          reporter,
          options: [...opponents].filter(opponent => schoolOf(reporter) !== schoolOf(opponent) && !met.has(pairKey(reporter, opponent)))
        })).sort((a, b) => a.options.length - b.options.length);

        const choice = constrained[0];
        if (!choice || choice.options.length === 0) return false;
        for (const opponent of shuffled(choice.options, random)) {
          const key = pairKey(choice.reporter, opponent);
          opponents.delete(opponent); met.add(key);
          fights.push({ reporter: choice.reporter, opponent });
          const next = remainingReporters.filter(t => t !== choice.reporter);
          if (assignReporter(next)) return true;
          fights.pop(); met.delete(key); opponents.add(opponent);
        }
        return false;
      }

      return assignReporter(reporters);
    }

    if (!solveRound(1)) return null;
    const verification = verify(schedule, teams, sequences);
    return verification.valid ? { matrix: schedule, sequences } : null;
  }

  function verify(schedule, teams, sequences) {
    const problems = [];
    const pairs = new Set();
    const perRound = new Map();
    const actualRoles = Object.fromEntries(teams.map(t => [t, []]));

    for (const f of schedule) {
      actualRoles[f.reporter][f.round - 1] = "R";
      actualRoles[f.opponent][f.round - 1] = "O";
      if (schoolOf(f.reporter) === schoolOf(f.opponent)) problems.push(`Same-school fight: ${f.reporter} vs ${f.opponent}`);
      const p = pairKey(f.reporter, f.opponent);
      if (pairs.has(p)) problems.push(`Repeated pairing: ${f.reporter} / ${f.opponent}`);
      pairs.add(p);
      if (!perRound.has(f.round)) perRound.set(f.round, new Set());
      for (const t of [f.reporter, f.opponent]) {
        if (perRound.get(f.round).has(t)) problems.push(`${t} appears more than once in round ${f.round}`);
        perRound.get(f.round).add(t);
      }
    }

    teams.forEach(t => {
      const actual = actualRoles[t].join("");
      const expected = sequences[t];
      if (actual !== expected) problems.push(`${t} follows ${actual || "an incomplete sequence"}, expected ${expected}.`);
      if (expected !== "RORO" && expected !== "OROR") problems.push(`${t} has invalid assigned sequence ${expected}.`);
    });
    const roroCount = teams.filter(t => sequences[t] === "RORO").length;
    if (roroCount !== teams.length / 2) problems.push(`Expected ${teams.length / 2} RORO teams, found ${roroCount}.`);
    for (let r = 1; r <= ROUNDS; r++) if ((perRound.get(r)?.size || 0) !== teams.length) problems.push(`Round ${r} is incomplete.`);
    return { valid: problems.length === 0, problems, actualRoles };
  }

  function generateAlternatives(teams, seed, count) {
    const outputs = [], seen = new Set();
    for (let attempt = 0; attempt < 500 && outputs.length < count; attempt++) {
      const s = `${seed}-${attempt}`;
      const generated = generate(teams, s);
      if (!generated) continue;
      const signature = teams.map(t => `${t}:${generated.sequences[t]}`).join("|") + "::" + generated.matrix.map(f => `${f.round}:${f.reporter}>${f.opponent}`).join("|");
      if (!seen.has(signature)) {
        seen.add(signature);
        outputs.push({ seed: s, matrix: generated.matrix, sequences: generated.sequences, verification: verify(generated.matrix, teams, generated.sequences) });
      }
    }
    return outputs;
  }

  return { schoolOf, validateTeams, generateAlternatives, verify };
})();
