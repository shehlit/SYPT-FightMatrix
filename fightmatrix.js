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

  // Search assigns one Reporter/Opponent role to every team in every round.
  // State is small (8 or 10 teams), so randomized backtracking is fast and reliable.
  function generate(teams, seedText) {
    const random = rng(seedText);
    const reportCount = Object.fromEntries(teams.map(t => [t, 0]));
    const opposeCount = Object.fromEntries(teams.map(t => [t, 0]));
    const met = new Set();
    const schedule = [];

    function solveRound(round) {
      if (round > ROUNDS) return true;
      const available = new Set(teams);
      const fights = [];

      function buildRoom() {
        if (available.size === 0) {
          schedule.push(...fights.map((f, i) => ({ round, room: i + 1, ...f })));
          if (solveRound(round + 1)) return true;
          schedule.splice(schedule.length - fights.length, fights.length);
          return false;
        }

        // Select a constrained team first: fewer valid partners = earlier choice.
        const choices = shuffled([...available], random).map(team => {
          const partners = [...available].filter(x => x !== team && schoolOf(x) !== schoolOf(team) && !met.has(pairKey(team, x)));
          return { team, score: partners.length };
        }).sort((a, b) => a.score - b.score);
        const first = choices[0].team;
        const partners = shuffled([...available].filter(x => x !== first && schoolOf(x) !== schoolOf(first) && !met.has(pairKey(first, x))), random);

        for (const second of partners) {
          const orientations = random() < .5 ? [[first, second], [second, first]] : [[second, first], [first, second]];
          for (const [reporter, opponent] of orientations) {
            if (reportCount[reporter] >= 2 || opposeCount[opponent] >= 2) continue;
            // By the final round, counts cannot exceed two and must reach two.
            const roundsLeftAfter = ROUNDS - round;
            if (reportCount[reporter] + 1 + roundsLeftAfter < 2 || opposeCount[opponent] + 1 + roundsLeftAfter < 2) continue;

            const key = pairKey(first, second);
            available.delete(first); available.delete(second); met.add(key);
            reportCount[reporter]++; opposeCount[opponent]++;
            fights.push({ reporter, opponent });

            if (buildRoom()) return true;

            fights.pop(); reportCount[reporter]--; opposeCount[opponent]--;
            met.delete(key); available.add(first); available.add(second);
          }
        }
        return false;
      }

      return buildRoom();
    }

    const ok = solveRound(1);
    if (!ok) return null;
    const verification = verify(schedule, teams);
    return verification.valid ? schedule : null;
  }

  function verify(schedule, teams) {
    const problems = [];
    const rc = Object.fromEntries(teams.map(t => [t, 0]));
    const oc = Object.fromEntries(teams.map(t => [t, 0]));
    const pairs = new Set();
    const perRound = new Map();

    for (const f of schedule) {
      rc[f.reporter]++; oc[f.opponent]++;
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
      if (rc[t] !== 2) problems.push(`${t} is Reporter ${rc[t]} times, expected 2.`);
      if (oc[t] !== 2) problems.push(`${t} is Opponent ${oc[t]} times, expected 2.`);
    });
    for (let r = 1; r <= ROUNDS; r++) if ((perRound.get(r)?.size || 0) !== teams.length) problems.push(`Round ${r} is incomplete.`);
    return { valid: problems.length === 0, problems };
  }

  function generateAlternatives(teams, seed, count) {
    const outputs = [], seen = new Set();
    for (let attempt = 0; attempt < 300 && outputs.length < count; attempt++) {
      const s = `${seed}-${attempt}`;
      const matrix = generate(teams, s);
      if (!matrix) continue;
      const signature = matrix.map(f => `${f.round}:${f.reporter}>${f.opponent}`).join("|");
      if (!seen.has(signature)) { seen.add(signature); outputs.push({ seed: s, matrix, verification: verify(matrix, teams) }); }
    }
    return outputs;
  }

  return { schoolOf, validateTeams, generateAlternatives, verify };
})();
