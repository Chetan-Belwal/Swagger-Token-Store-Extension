document.querySelector(".store-token").addEventListener("click", function () {
  if (document.querySelector(".new-token").style.display === "block") {
    document.querySelector(".new-token").style.display = "none";
  } else {
    document.querySelector(".new-token").style.display = "block";
  }
});

document.querySelector("#save-btn").addEventListener("click", function () {
  const description = document.querySelector(".new-token input").value;
  const token = document.querySelector(".new-token textarea").value;

  if (description !== "" && token !== "") {
    chrome.storage.local.get(["tokens"], (item) => {
      let itemArr = item.tokens;
      itemArr.push({ description, token, lastUsed: false });
      saveItems(itemArr);
      fetchItems();
    });
  }

  document.querySelector(".new-token").style.display = "none";
});

document.querySelector("#save-set-btn").addEventListener("click", function () {
  const description = document.querySelector(".new-token input").value;
  const token = document.querySelector(".new-token textarea").value;

  if (description !== "" && token !== "") {
    chrome.storage.local.get(["tokens"], (item) => {
      item.tokens.forEach((element) => {
        element.lastUsed = false;
      });

      let itemArr = item.tokens;
      itemArr.push({ description, token, lastUsed: true });
      saveItems(itemArr);
      setTokenFunc(token, description);
      fetchItems();
    });
  }

  document.querySelector(".new-token").style.display = "none";
});

const setTokenFunc = async (token, description) => {
  let [tab] = await chrome.tabs.query({ active: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (tokenz, des) => {
      if (document.body.getElementsByClassName("btn authorize locked")[0]) {
        await document.body
          .getElementsByClassName("btn authorize locked")[0]
          .click();
        await document.body
          .getElementsByClassName("btn modal-btn auth button")[0]
          .click();
      }
      const title = document.body.getElementsByClassName("title")[0];
      const userProvidedTitle = title.innerHTML.split("🚀")[0];
      title.innerHTML = "";
      title.innerHTML = `${userProvidedTitle}  🚀🌟 STS Extension Active 🌟🚀 current token: ${des} 🌟🚀`;

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
    },
    args: [token, description],
  });
};

function fetchItems() {
  const itemList = document.querySelector("ul.token-list-items");
  itemList.innerHTML = "";
  let newItemHtml = "";
  chrome.storage.local.get(["tokens"], (res) => {
    let itemArr = res.tokens;
    try {
      for (let i = 0; i < itemArr.length; i++) {
        newItemHtml += ` <li data-item-index=${i}>
      <span style="width: 100px; word-break: break-word;" class="description">
      ${itemArr[i].description}
      </span>
        <span style="overflow: auto; word-break: break-word; max-width: 100px; max-height: 60px;" class="token" > ${itemArr[i].token}</span>
        <div style="width: 129px;">
          <span
            ><button
              id="setButton"
              type="submit"
              style="
                background-color: #14a44d;
                border-radius: 3px;
                border: 2px solid rgb(21, 20, 20);
                color: white;
                cursor: pointer;
              "
            >
              Set
            </button> </span
          ><span
            ><button
            id= "delButton"
              style="
                background-color: #dc4c64;
                border-radius: 3px;
                border: 2px solid rgb(45, 44, 44);
                color: white;
                cursor: pointer;
              "
            >
              Del
            </button></span
          >
          <span
            ><button
            id= "copyButton"
              style="
                background-color: #dc4c64;
                border-radius: 3px;
                border: 2px solid rgb(45, 44, 44);
                color: white;
                cursor: pointer;
              "
            >
              📋
            </button></span
          >
        </div>
      </li>`;
      }
    } catch (e) {
      saveItems([]);
    }
    itemList.innerHTML = newItemHtml;

    var itemsListUL = document.querySelectorAll("ul li");
    for (let i = 0; i < itemsListUL.length; i++) {
      itemsListUL[i]
        .querySelector("#setButton")
        .addEventListener("click", () => {
          chrome.storage.local.get(["tokens"], (res) => {
            res.tokens.forEach((element, index) => {
              if (index === i) {
                element.lastUsed = true;    
              } else {
                element.lastUsed = false;
              }
            });
            saveItems(res.tokens);
          });
          const token = itemsListUL[i].querySelector(".token").textContent;
          const description =
            itemsListUL[i].querySelector(".description").textContent;
          setTokenFunc(token, description);
        });

      itemsListUL[i]
        .querySelector("#delButton")
        .addEventListener("click", () => {
          deleteItem(i);
        });

      itemsListUL[i]
        .querySelector("#copyButton")
        .addEventListener("click", () => {
          let copiedContent =
            itemsListUL[i].querySelector(".token").textContent;
          navigator.clipboard.writeText(copiedContent);
        });

      itemsListUL[i].querySelector(".token").addEventListener("click", () => {
        const token = itemsListUL[i].querySelector(".token");
        // itemsListUL[i].innerHTML = '<input type="text">'
        token.innerHTML = `<textarea autofocus rows =10 >${token.innerText}</textarea>`
      });
    }
  });
}

function saveItems(tokens) {
  chrome.storage.local.set({ tokens: tokens });
}

function deleteItem(i) {
  chrome.storage.local.get(["tokens"], (item) => {
    let itemArr = item.tokens;
    itemArr.splice(i, 1);
    saveItems(itemArr);
    fetchItems();
  });
}

function updateItem(i, newToken) {
  chrome.storage.local.get(["tokens"], (item) => {
    let itemArr = item.tokens;
    itemArr[i].tokens.token = newToken;
    saveItems(itemArr);
    fetchItems();
  });
}

fetchItems();
