Cypress.Commands.add(
  'createFunction',
  (functionName, functionPath, dependenciesPath) => {
    cy.getLeftNav()
      .contains('Workloads')
      .click();

    cy.getLeftNav()
      .contains('Functions')
      .click();

    cy.getIframeBody()
      .contains('Create Function')
      .click();

    cy.getIframeBody()
      .find('[placeholder="Function Name"]')
      .clear()
      .type(functionName);

    cy.getIframeBody()
      .find('[placeholder="Enter Labels key=value"]')
      .type('app=' + functionName);

    cy.getIframeBody()
      .contains('label', 'Labels')
      .click();

    cy.getIframeBody()
      .find('[placeholder="Enter Labels key=value"]')
      .type('example=' + functionName);

    cy.getIframeBody()
      .contains('label', 'Labels')
      .click();

    cy.getIframeBody()
      .find('[role="dialog"]')
      .contains('button', 'Create')
      .click();

    cy.getIframeBody()
      .find('[role="status"]', { timeout: 60 * 1000 })
      .should('not.have.text', 'BUILDING');

    cy.readFile(functionPath).then(body => {
      cy.getIframeBody()
        .find('textarea[aria-roledescription="editor"]')
        .filter(':visible')
        .type('{selectall}{backspace}{selectall}{backspace}')
        .paste({
          pastePayload: body,
        });
    });

    cy.getIframeBody()
      .find('[aria-controls="function-dependencies"]')
      .click();

    cy.readFile(dependenciesPath).then(body => {
      cy.getIframeBody()
        .find('textarea[aria-roledescription="editor"]')
        .filter(':visible')
        // cy.clear sometimes fails, removing only the first character - use this as a workaround
        .type('{selectall}{backspace}{selectall}{backspace}')
        .paste({
          pastePayload: JSON.stringify(body),
        });
    });

    cy.getIframeBody()
      .find('.lambda-details')
      .contains('button', 'Save')
      .should('not.be.disabled')
      .click();

    cy.getIframeBody()
      .find('[role="status"]', { timeout: 60 * 1000 })
      .should('not.have.text', 'BUILDING');

    cy.getIframeBody()
      .find('[role="status"]', { timeout: 120 * 1000 })
      .should('have.text', 'RUNNING');

    cy.getLeftNav()
      .contains('Workloads')
      .click();
  },
);
