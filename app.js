"use strict";

(() => {

  const teamsEl =
    document.getElementById(
      "teams"
    );


  const seedEl =
    document.getElementById(
      "seed"
    );


  const alternativesEl =
    document.getElementById(
      "alternatives"
    );


  const messageEl =
    document.getElementById(
      "message"
    );


  const resultsEl =
    document.getElementById(
      "results"
    );


  const example8 = [

    "SchoolA_1",
    "SchoolA_2",

    "SchoolB_1",
    "SchoolB_2",

    "SchoolC_1",
    "SchoolC_2",

    "SchoolD_1",
    "SchoolD_2"

  ];


  const example10 = [

    ...example8,

    "SchoolE_1",
    "SchoolE_2"

  ];


  function defaultMatrixId() {

    /*
     * Matrices are normally
     * prepared near the end of
     * the year for the following
     * year's SYPT.
     */

    return (
      `SYPT-${
        new Date()
          .getFullYear()
        + 1
      }`
    );
  }


  seedEl.value =
    defaultMatrixId();


  function teamCount() {

    return Number(

      document
        .querySelector(
          'input[name="teamCount"]:checked'
        )
        .value

    );
  }


  function teams() {

    return teamsEl
      .value
      .split(/\r?\n/)
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);
  }


  function escapeHtml(value) {

    return String(value)
      .replace(
        /[&<>"']/g,
        character => ({

          "&":
            "&amp;",

          "<":
            "&lt;",

          ">":
            "&gt;",

          '"':
            "&quot;",

          "'":
            "&#39;"

        })[character]
      );
  }


  /*
   * 8-team / 10-team selector
   */

  document
    .querySelectorAll(
      'input[name="teamCount"]'
    )
    .forEach(
      radio => {

        radio.addEventListener(
          "change",
          () => {

            const current =
              teams()
                .join("\n");


            /*
             * Only replace the
             * textarea automatically
             * when it still contains
             * the example teams.
             *
             * This avoids deleting a
             * real team list.
             */

            if (
              current
              ===
              example8.join("\n")

              ||

              current
              ===
              example10.join("\n")
            ) {

              teamsEl.value =

                (
                  teamCount() === 8

                    ? example8

                    : example10
                )
                .join("\n");

            }


            resultsEl.innerHTML =
              "";


            messageEl.textContent =
              "";

          }
        );

      }
    );


  /*
   * Generate Fight Matrices
   */

  document
    .getElementById(
      "generate"
    )
    .addEventListener(
      "click",
      () => {

        const teamList =
          teams();


        const errors =
          SYPTMatrix
            .validateTeams(
              teamList,
              teamCount()
            );


        resultsEl.innerHTML =
          "";


        if (
          errors.length
        ) {

          messageEl.className =
            "message error";


          messageEl.innerHTML =
            errors
              .map(
                escapeHtml
              )
              .join("<br>");


          return;
        }


        const baseSeed =

          seedEl
            .value
            .trim()

          ||

          defaultMatrixId();


        seedEl.value =
          baseSeed;


        const wanted =
          Number(
            alternativesEl
              .value
          );


        const generated =
          SYPTMatrix
            .generateAlternatives(
              teamList,
              baseSeed,
              wanted
            );


        if (
          !generated.length
        ) {

          messageEl.className =
            "message error";


          messageEl.textContent =

            "No valid matrix was found. " +

            "Check the team/school combination " +

            "or change the Matrix ID and try again.";


          return;
        }


        messageEl.className =

          generated.length
          ===
          wanted

            ? "message ok"

            : "message error";


        messageEl.textContent =

          generated.length
          ===
          wanted

            ?

            `${generated.length} valid matrix option(s) generated.`

            :

            `Only ${generated.length} distinct valid option(s) were found.`;


        generated.forEach(
          (result, index) => {

            resultsEl.appendChild(

              renderMatrix(
                result,
                index + 1
              )

            );

          }
        );

      }
    );


  /*
   * Print / PDF
   */

  document
    .getElementById(
      "print"
    )
    .addEventListener(
      "click",
      () =>
        window.print()
    );


  function renderMatrix(
    result,
    number
  ) {

    const section =
      document.createElement(
        "section"
      );


    section.className =
      "card";


    /*
     * Matrix header
     */

    const heading =
      document.createElement(
        "div"
      );


    heading.className =
      "matrix-head";


    heading.innerHTML =

      `<h2>Matrix ${number}</h2>`

      +

      `<span class="badge">` +
      `✓ VALID MATRIX` +
      `</span>`;


    section.appendChild(
      heading
    );


    /*
     * Matrix ID
     */

    const id =
      document.createElement(
        "p"
      );


    id.innerHTML =

      `<strong>Matrix ID:</strong> `

      +

      escapeHtml(
        result.seed
      );


    section.appendChild(
      id
    );


    /*
     * Team role sequences
     */

    const sequenceWrap =
      document.createElement(
        "div"
      );


    sequenceWrap.className =
      "table-wrap";


    let sequenceHtml =

      "<h3>Team role sequences</h3>"

      +

      "<table>"

      +

      "<thead>"

      +

      "<tr>"

      +

      "<th>Team</th>"

      +

      "<th>Sequence</th>"

      +

      "</tr>"

      +

      "</thead>"

      +

      "<tbody>";


    Object
      .entries(
        result.sequences
      )
      .sort(
        ([first], [second]) =>
          first.localeCompare(
            second
          )
      )
      .forEach(
        ([team, sequence]) => {

          sequenceHtml +=

            "<tr>"

            +

            `<td>${
              escapeHtml(team)
            }</td>`

            +

            `<td>` +
            `<strong>${sequence}</strong>` +
            `</td>`

            +

            "</tr>";

        }
      );


    sequenceHtml +=

      "</tbody>"

      +

      "</table>";


    sequenceWrap.innerHTML =
      sequenceHtml;


    section.appendChild(
      sequenceWrap
    );


    /*
     * Fight matrix
     */

    const tableWrap =
      document.createElement(
        "div"
      );


    tableWrap.className =
      "table-wrap";


    let matrixHtml =

      "<h3>Fight matrix</h3>"

      +

      "<table>"

      +

      "<thead>"

      +

      "<tr>"

      +

      "<th>Round</th>"

      +

      "<th>Room</th>"

      +

      "<th>Reporter</th>"

      +

      "<th>Opponent</th>"

      +

      "</tr>"

      +

      "</thead>"

      +

      "<tbody>";


    result.matrix.forEach(
      fight => {

        matrixHtml +=

          "<tr>"

          +

          `<td>${fight.round}</td>`

          +

          `<td>${fight.room}</td>`

          +

          `<td>${
            escapeHtml(
              fight.reporter
            )
          }</td>`

          +

          `<td>${
            escapeHtml(
              fight.opponent
            )
          }</td>`

          +

          "</tr>";

      }
    );


    matrixHtml +=

      "</tbody>"

      +

      "</table>";


    tableWrap.innerHTML =
      matrixHtml;


    section.appendChild(
      tableWrap
    );


    /*
     * Validation summary
     */

    const validation =
      document.createElement(
        "div"
      );


    validation.className =
      "validation";


    [
      "One R and one O in Rounds 1-2",

      "One R and one O in Rounds 3-4",

      "Exactly 2R and 2O overall",

      "All teams appear once per round",

      "No repeated pairings",

      "No same-school encounters",

      "All fights assigned"

    ]
    .forEach(text => {

      const item =
        document.createElement(
          "span"
        );


      item.textContent =
        `✓ ${text}`;


      validation.appendChild(
        item
      );

    });


    section.appendChild(
      validation
    );


    /*
     * CSV button
     */

    const actions =
      document.createElement(
        "div"
      );


    actions.className =
      "matrix-actions";


    const csvButton =
      document.createElement(
        "button"
      );


    csvButton.type =
      "button";


    csvButton.className =
      "secondary";


    csvButton.textContent =
      "Download CSV";


    csvButton.addEventListener(
      "click",
      () => {

        downloadCSV(

          result.matrix,

          result.sequences,

          result.seed

        );

      }
    );


    actions.appendChild(
      csvButton
    );


    section.appendChild(
      actions
    );


    return section;
  }


  function downloadCSV(
    matrix,
    sequences,
    seed
  ) {

    const rows = [[

      "Round",

      "Room",

      "Reporter",

      "Reporter Sequence",

      "Opponent",

      "Opponent Sequence"

    ]];


    matrix.forEach(
      fight => {

        rows.push([

          fight.round,

          fight.room,

          fight.reporter,

          sequences[
            fight.reporter
          ],

          fight.opponent,

          sequences[
            fight.opponent
          ]

        ]);

      }
    );


    const csv =

      rows
        .map(
          row =>

            row
              .map(
                value =>

                  `"${

                    String(value)
                      .replaceAll(
                        '"',
                        '""'
                      )

                  }"`

              )
              .join(",")

        )
        .join("\r\n");


    const blob =
      new Blob(
        [csv],
        {

          type:
            "text/csv;charset=utf-8"

        }
      );


    const link =
      document.createElement(
        "a"
      );


    link.href =
      URL.createObjectURL(
        blob
      );


    link.download =
      `${seed}.csv`;


    document.body
      .appendChild(
        link
      );


    link.click();


    URL.revokeObjectURL(
      link.href
    );


    link.remove();
  }

})();
