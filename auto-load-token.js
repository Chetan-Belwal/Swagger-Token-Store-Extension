// Wait for Swagger UI to be fully loaded
const waitForSwaggerUI = () => {
  return new Promise((resolve) => {
    // Check if Swagger UI is already loaded
    const checkSwaggerLoaded = () => {
      const swaggerContainer = document.getElementById("swagger-ui");
      const title = document.querySelector(".title");
      const authButton = document.querySelector(".btn.authorize");
      
      if (swaggerContainer && title && authButton) {
        resolve();
        return true;
      }
      return false;
    };

    // If already loaded, resolve immediately
    if (checkSwaggerLoaded()) {
      return;
    }

    // Otherwise, use MutationObserver to watch for changes
    const observer = new MutationObserver((mutations) => {
      if (checkSwaggerLoaded()) {
        observer.disconnect();
        resolve();
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Failsafe timeout (10 seconds)
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 10000);
  });
};

const setLastUsedToken = async (token, description) => {
  try {
    // Wait for Swagger UI to be fully loaded
    await waitForSwaggerUI();
    
    // Additional small delay to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const title = document.querySelector(".title");
    if (!title) {
      console.warn("Swagger title not found");
      return;
    }

    // Update title
    const userProvidedTitle = title.innerHTML.split("🚀")[0];
    title.innerHTML = `${userProvidedTitle} 🚀🌟 STS Extension Active 🌟🚀 current token(Last used): ${description} 🌟🚀`;

    // Find and click authorize button
    const authButton = document.querySelector(".btn.authorize.unlocked") || 
                      document.querySelector(".btn.authorize");
    
    if (!authButton) {
      console.warn("Authorization button not found");
      return;
    }

    authButton.click();
    
    // Wait for modal to open
    await new Promise(resolve => setTimeout(resolve, 300));

    // Find and fill token input
    const inputField = document.querySelector('input[aria-label="auth-bearer-value"]') ||
                      document.querySelector('input[placeholder*="Bearer"]') ||
                      document.querySelector('.auth-container input[type="text"]');

    if (!inputField) {
      console.warn("Token input field not found");
      return;
    }

    // Set token value
    inputField.value = token.trim();
    inputField.dispatchEvent(new Event("input", { bubbles: true }));
    inputField.dispatchEvent(new Event("change", { bubbles: true }));

    // Wait a bit then click authorize
    await new Promise(resolve => setTimeout(resolve, 200));

    const authorizeBtn = document.querySelector(".btn.modal-btn.auth.authorize.button") ||
                        document.querySelector(".authorize-btn") ||
                        document.querySelector('button[type="submit"]');

    if (authorizeBtn) {
      authorizeBtn.click();
      
      // Wait and then close modal
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const closeBtn = document.querySelector(".btn.modal-btn.auth.btn-done.button") ||
                      document.querySelector(".modal-btn.btn-done") ||
                      document.querySelector('.close-modal');
      
      if (closeBtn) {
        closeBtn.click();
      }
    }

    console.log(`Token set successfully: ${description}`);
    
  } catch (error) {
    console.error("Error setting token:", error);
  }
};

// Initialize when page loads
const initialize = () => {
  // Check if this is a Swagger page
  if (window.location.href.includes('swagger') || 
      document.getElementById('swagger-ui') || 
      document.querySelector('.swagger-ui')) {
    
    chrome.storage?.local?.get(["tokens"], (res) => {
      if (res?.tokens) {
        const lastUsedToken = res.tokens.find(token => token.lastUsed === true);
        if (lastUsedToken) {
          setLastUsedToken(lastUsedToken.token, lastUsedToken.description);
        }
      }
    });
  }
};

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}