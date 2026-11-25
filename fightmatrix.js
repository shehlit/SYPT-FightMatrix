"use strict";

const SYPTMatrix = (() => {

  const ROUNDS = 4;

  const ALLOWED_SEQUENCES =
    new Set([
      "RORO",
      "ROOR",
      "ORRO",
      "OROR"
    ]);


  function schoolOf(team) {

    const index =
      team.lastIndexOf("_");

    return index > 0
      ? team
          .slice(0, index)
          .trim()
          .toLowerCase()
      : "";
  }


  function validateTeams(
    teams,
    expected
  ) {

    const errors = [];


    if (
      teams.length !== expected
    ) {

      errors.push(
        `Enter exactly ${expected} teams.`
      );
    }


    if (
      new Set(
        teams.map(
          team =>
            team.toLowerCase()
        )
      ).size
      !==
      teams.length
    ) {

      errors.push(
        "Team identifiers must be unique."
      );
    }


    const identifierPattern =
      /^.+_[1-9]\d*$/;


    teams.forEach(team => {

      if (
        !identifierPattern.test(team)
      ) {

        errors.push(
          `Invalid team identifier: ${team}. ` +
          `Use school_teamnumber, e.g. HCI_1.`
        );
      }

    });


    const schoolCounts =
      new Map();


    teams.forEach(team => {

      const school =
        schoolOf(team);

      schoolCounts.set(
        school,
        (schoolCounts.get(school) || 0) + 1
      );

    });


    schoolCounts.forEach(
      (count, school) => {

        if (
          count > 2
        ) {

          errors.push(
            `School ${school} has ${count} teams; ` +
            `maximum is 2.`
          );
        }

      }
    );


    return [
      ...new Set(errors)
    ];
  }


  function hashSeed(text) {

    let hash =
      2166136261 >>> 0;


    for (
      let index = 0;
      index < text.length;
      index += 1
    ) {

      hash ^=
        text.charCodeAt(index);

      hash =
        Math.imul(
          hash,
          16777619
        );
    }


    return hash >>> 0;
  }


  function makeRandom(
    seedText
  ) {

    let state =
      hashSeed(seedText) || 1;


    return () => {

      state |= 0;

      state =
        (
          state
          +
          0x6D2B79F5
        ) | 0;


      let value =
        Math.imul(
          state
          ^
          (state >>> 15),

          1 | state
        );


      value =
        (
          value
          +
          Math.imul(
            value
            ^
            (value >>> 7),

            61 | value
          )
        )
        ^
        value;


      return (
        (
          value
          ^
          (value >>> 14)
        )
        >>> 0
      )
      /
      4294967296;

    };
  }


  function shuffled(
    items,
    random
  ) {

    const result =
      [...items];


    for (
      let index =
        result.length - 1;

      index > 0;

      index -= 1
    ) {

      const swapIndex =
        Math.floor(
          random()
          *
          (index + 1)
        );


      [
        result[index],
        result[swapIndex]
      ] =
      [
        result[swapIndex],
        result[index]
      ];
    }


    return result;
  }


  function pairKey(
    teamA,
    teamB
  ) {

    return [
      teamA,
      teamB
    ]
      .sort()
      .join("||");
  }


  /*
   * ROLE RULE
   *
   * Rounds 1-2:
   * every team must have
   * one R and one O.
   *
   * Rounds 3-4:
   * every team must again have
   * one R and one O.
   *
   * Therefore the only possible
   * four-round sequences are:
   *
   * RORO
   * ROOR
   * ORRO
   * OROR
   */

  function buildRolePlan(
    teams,
    random
  ) {

    const half =
      teams.length / 2;


    /*
     * Choose half of the teams
     * to be Reporters in Round 1.
     *
     * Their roles automatically
     * reverse in Round 2.
     */

    const round1Reporters =
      new Set(

        shuffled(
          teams,
          random
        )
        .slice(
          0,
          half
        )

      );


    /*
     * Independently choose half
     * of the teams as Reporters
     * in Round 3.
     *
     * Their roles automatically
     * reverse in Round 4.
     */

    const round3Reporters =
      new Set(

        shuffled(
          teams,
          random
        )
        .slice(
          0,
          half
        )

      );


    const roles = {};

    const sequences = {};


    teams.forEach(team => {

      roles[team] = [

        round1Reporters.has(team)
          ? "R"
          : "O",

        round1Reporters.has(team)
          ? "O"
          : "R",

        round3Reporters.has(team)
          ? "R"
          : "O",

        round3Reporters.has(team)
          ? "O"
          : "R"

      ];


      sequences[team] =
        roles[team].join("");

    });


    return {

      roles,

      sequences

    };
  }


  function generate(
    teams,
    seedText
  ) {

    const random =
      makeRandom(
        seedText
      );


    const {
      roles,
      sequences
    } =
      buildRolePlan(
        teams,
        random
      );


    const previousMeetings =
      new Set();


    const schedule = [];


    /*
     * Solve one round at a time.
     */

    function solveRound(
      round
    ) {

      if (
        round > ROUNDS
      ) {

        return true;
      }


      const reporters =
        teams.filter(
          team =>
            roles[team][
              round - 1
            ]
            ===
            "R"
        );


      const opponents =
        new Set(

          teams.filter(
            team =>
              roles[team][
                round - 1
              ]
              ===
              "O"
          )

        );


      const fights = [];


      function assignReporters(
        remainingReporters
      ) {

        /*
         * If all Reporters have
         * been assigned an Opponent,
         * the current round is
         * complete.
         */

        if (
          remainingReporters
            .length === 0
        ) {

          const roomOrder =
            shuffled(
              fights,
              random
            );


          schedule.push(
            ...roomOrder.map(
              (fight, index) => ({

                round,

                room:
                  index + 1,

                ...fight

              })
            )
          );


          /*
           * Now attempt the
           * following round.
           */

          if (
            solveRound(
              round + 1
            )
          ) {

            return true;
          }


          /*
           * Later round failed,
           * so undo this complete
           * round and try another
           * matching.
           */

          schedule.splice(

            schedule.length
            -
            roomOrder.length,

            roomOrder.length

          );


          return false;
        }


        /*
         * Select the Reporter with
         * the fewest possible
         * opponents.
         *
         * This makes the
         * backtracking search much
         * more efficient.
         */

        const choices =

          shuffled(
            remainingReporters,
            random
          )

          .map(reporter => ({

            reporter,

            options:
              [...opponents]
                .filter(
                  opponent =>

                    schoolOf(
                      reporter
                    )
                    !==
                    schoolOf(
                      opponent
                    )

                    &&

                    !previousMeetings
                      .has(
                        pairKey(
                          reporter,
                          opponent
                        )
                      )

                )

          }))

          .sort(
            (first, second) =>
              first.options.length
              -
              second.options.length
          );


        const choice =
          choices[0];


        if (
          !choice
          ||
          choice.options.length === 0
        ) {

          return false;
        }


        /*
         * Try each available
         * opponent.
         */

        for (
          const opponent
          of shuffled(
            choice.options,
            random
          )
        ) {

          const key =
            pairKey(
              choice.reporter,
              opponent
            );


          opponents.delete(
            opponent
          );


          previousMeetings.add(
            key
          );


          fights.push({

            reporter:
              choice.reporter,

            opponent

          });


          const nextReporters =

            remainingReporters
              .filter(
                team =>
                  team
                  !==
                  choice.reporter
              );


          if (
            assignReporters(
              nextReporters
            )
          ) {

            return true;
          }


          /*
           * Backtrack.
           */

          fights.pop();


          previousMeetings.delete(
            key
          );


          opponents.add(
            opponent
          );

        }


        return false;
      }


      return assignReporters(
        reporters
      );
    }


    if (
      !solveRound(1)
    ) {

      return null;
    }


    const verification =
      verify(
        schedule,
        teams,
        sequences
      );


    return verification.valid

      ? {

          matrix:
            schedule,

          sequences

        }

      : null;
  }


  function verify(
    schedule,
    teams,
    sequences
  ) {

    const problems = [];


    const meetingPairs =
      new Set();


    const teamsPerRound =
      new Map();


    const actualRoles =
      Object.fromEntries(

        teams.map(
          team => [
            team,
            []
          ]
        )

      );


    for (
      const fight
      of schedule
    ) {

      /*
       * Record actual roles.
       */

      actualRoles[
        fight.reporter
      ][fight.round - 1] =
        "R";


      actualRoles[
        fight.opponent
      ][fight.round - 1] =
        "O";


      /*
       * No same-school fight.
       */

      if (
        schoolOf(
          fight.reporter
        )
        ===
        schoolOf(
          fight.opponent
        )
      ) {

        problems.push(

          `Same-school fight: ` +

          `${fight.reporter} ` +

          `vs ` +

          `${fight.opponent}`

        );
      }


      /*
       * No repeat meeting.
       */

      const key =
        pairKey(
          fight.reporter,
          fight.opponent
        );


      if (
        meetingPairs.has(
          key
        )
      ) {

        problems.push(

          `Repeated pairing: ` +

          `${fight.reporter} / ` +

          `${fight.opponent}`

        );
      }


      meetingPairs.add(
        key
      );


      /*
       * Track participation
       * within the round.
       */

      if (
        !teamsPerRound.has(
          fight.round
        )
      ) {

        teamsPerRound.set(

          fight.round,

          new Set()

        );
      }


      [
        fight.reporter,
        fight.opponent
      ]
      .forEach(team => {

        if (
          teamsPerRound
            .get(fight.round)
            .has(team)
        ) {

          problems.push(

            `${team} appears more ` +

            `than once in Round ` +

            `${fight.round}.`

          );
        }


        teamsPerRound
          .get(fight.round)
          .add(team);

      });

    }


    /*
     * Validate role sequences.
     */

    teams.forEach(team => {

      const actualSequence =
        actualRoles[team]
          .join("");


      const plannedSequence =
        sequences[team];


      if (
        actualSequence
        !==
        plannedSequence
      ) {

        problems.push(

          `${team} has sequence ` +

          `${actualSequence || "incomplete"}; ` +

          `expected ${plannedSequence}.`

        );
      }


      if (
        !ALLOWED_SEQUENCES
          .has(
            actualSequence
          )
      ) {

        problems.push(

          `${team} has invalid sequence ` +

          `${actualSequence || "incomplete"}.`

        );
      }


      /*
       * Rounds 1-2 must contain
       * exactly R and O.
       */

      const firstBlock =

        actualSequence
          .slice(0, 2)
          .split("")
          .sort()
          .join("");


      if (
        firstBlock !== "OR"
      ) {

        problems.push(

          `${team} is not balanced ` +

          `in Rounds 1-2.`

        );
      }


      /*
       * Rounds 3-4 must also
       * contain exactly R and O.
       */

      const secondBlock =

        actualSequence
          .slice(2, 4)
          .split("")
          .sort()
          .join("");


      if (
        secondBlock !== "OR"
      ) {

        problems.push(

          `${team} is not balanced ` +

          `in Rounds 3-4.`

        );
      }

    });


    /*
     * Every team must participate
     * exactly once per round.
     */

    for (
      let round = 1;

      round <= ROUNDS;

      round += 1
    ) {

      if (
        (
          teamsPerRound
            .get(round)
            ?.size
          || 0
        )
        !==
        teams.length
      ) {

        problems.push(
          `Round ${round} is incomplete.`
        );
      }

    }


    return {

      valid:
        problems.length === 0,

      problems

    };
  }


  function generateAlternatives(
    teams,
    seed,
    count
  ) {

    const outputs = [];

    const seen =
      new Set();


    /*
     * Try deterministic variations
     * of the user's Matrix ID.
     */

    for (
      let attempt = 0;

      attempt < 2000
      &&
      outputs.length < count;

      attempt += 1
    ) {

      const matrixSeed =
        `${seed}-${attempt}`;


      const generated =
        generate(
          teams,
          matrixSeed
        );


      if (
        !generated
      ) {

        continue;
      }


      const signature =

        teams
          .map(
            team =>
              `${team}:` +
              `${generated.sequences[team]}`
          )
          .join("|")

        +

        "::"

        +

        generated.matrix
          .map(
            fight =>
              `${fight.round}:` +
              `${fight.reporter}>` +
              `${fight.opponent}`
          )
          .join("|");


      if (
        !seen.has(
          signature
        )
      ) {

        seen.add(
          signature
        );


        outputs.push({

          seed:
            matrixSeed,

          matrix:
            generated.matrix,

          sequences:
            generated.sequences,

          verification:
            verify(
              generated.matrix,
              teams,
              generated.sequences
            )

        });

      }

    }


    return outputs;
  }


  return {

    schoolOf,

    validateTeams,

    generateAlternatives,

    verify

  };

})();
