const setLastUsedToken = (tokenz, des) => {
  if (document.getElementById("swagger-ui")) {
    setTimeout(async () => {
      const title = document.body.getElementsByClassName("title")[0];
      const userProvidedTitle = title.innerHTML.split("🚀")[0];
      title.innerHTML = "";
      title.innerHTML = `${userProvidedTitle}  🚀🌟 STS Extension Active 🌟🚀 current token(Last used): ${des} 🌟🚀`;

      //perfom click action on swagger authorization button
      await document.body
        .getElementsByClassName("btn authorize unlocked")[0]
        .click();

      //selecting input area(The area we input our token)
      const inputField = document.body.querySelector(
        'input[aria-label="auth-bearer-value"]'
      );

      inputField.value = tokenz.trim();

      //fire the input event
      const customInputEvent = new Event("input", { bubbles: true });
      inputField.dispatchEvent(customInputEvent);

      //perform click action on authorize button
      await document.body
        .getElementsByClassName("btn modal-btn auth authorize button")[0]
        .click();
      //perform click action on the close button
      await document.body
        .getElementsByClassName("btn modal-btn auth btn-done button")[0]
        .click();
    }, 1000);
  }
};

chrome.storage.local.get(["tokens"], (res) => {
  res.tokens.forEach((element) => {
    if (element.lastUsed === true) {
      setLastUsedToken(element.token, element.description);
    }
  });
});
