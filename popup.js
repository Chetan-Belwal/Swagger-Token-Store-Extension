const colorMap = new Map([['info', 'background: #17a2b8;'], ['danger', 'background: #DC3545'], ['success', 'background: #28a745;']])

class TokenManager {
  constructor() {
      this.tokens = [];
      this.init();
      this.bindTokenActions();
  }

  init() {
      this.bindEvents();
      this.loadTokens();
  }

  bindEvents() {
      // Toggle form visibility
      document.getElementById('add-token-btn').addEventListener('click', () => {
          this.toggleForm();
      });

      // Save token
      document.getElementById('save-btn').addEventListener('click', () => {
          this.saveToken(false);
      });

      // Save and set token
      document.getElementById('save-set-btn').addEventListener('click', () => {
          this.saveToken(true);
      });
  }

  toggleForm() {
      const form = document.getElementById('token-form');
      const isVisible = form.style.display === 'block';
      form.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
          document.getElementById('token-desc').focus();
      }
  }

  async saveToken(setActive = false) {
      const desc = document.getElementById('token-desc').value.trim();
      const token = document.getElementById('token-value').value.trim();

      if (!desc || !token) {
          this.showNotification('Please fill in both description and token', 'danger');
          return;
      }
      // Get existing tokens
      const result = await this.getStoredTokens();
      let tokens = result.tokens || [];

      // If setting as active, mark all others as inactive
      if (setActive) {
          tokens.forEach(t => t.lastUsed = false);
      }

      // Add new token
      tokens.push({
          description: desc,
          token: token,
          lastUsed: setActive,
          createdAt: Date.now()
      });

      // Save to storage
      await this.saveTokens(tokens);

      // If setting as active, inject into current tab
      if (setActive) {
          await this.setTokenInTab(token, desc);
      }

      this.showNotification('Token saved successfully 🚀🌟', 'success')

      // Clear form and hide
      this.clearForm();
      this.toggleForm();
      
      // Reload the list
      this.loadTokens();
  }

  // Main action function
  async setTokenInTab(token, description) {
      try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    
          await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: async (token, des) => {
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
          
                inputField.value = token.trim();
          
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
              args: [token, description]
          });
      } catch (error) {
          console.error('Error injecting token:', error);
      }
  }

  async loadTokens() {
      const result = await this.getStoredTokens();
      this.tokens = result.tokens || [];
      this.renderTokens();
  }

  renderTokens() {
      const container = document.getElementById('token-list');
      const emptyState = document.getElementById('empty-state');

      if (this.tokens.length === 0) {
          container.style.display = 'none';
          emptyState.style.display = 'block';
          return;
      }

      emptyState.style.display = 'none';
      container.style.display = 'block';

      container.innerHTML = this.tokens.map((token, index) => {
          const isEditing = token.isEditing;
          return `
              <div class="token-item ${token.lastUsed ? 'active-token' : ''} ${isEditing ? 'editing' : ''}" data-index="${index}" title="Double click to set token">
                  <div class="token-desc-container">
                      ${isEditing ? 
                          `<input type="text" class="desc-edit-input" value="${this.escapeHtml(token.description)}" data-original="${this.escapeHtml(token.description)}">` :
                          `<div class="token-desc" title="Double-click to edit">${this.escapeHtml(token.description)}</div>`
                      }
                  </div>
                  <div class="token-value-container">
                      ${isEditing ? 
                          `<textarea class="edit-input" data-original="${this.escapeHtml(token.token)}">${this.escapeHtml(token.token)}</textarea>
                           <div class="edit-actions">
                              <button class="edit-btn save-edit-btn">✓ Save</button>
                              <button class="edit-btn cancel-edit-btn">✗ Cancel</button>
                           </div>` :
                          `<div class="token-value" title="Click to copy • Double-click to edit">${this.truncateToken(token.token)}</div>`
                      }
                  </div>
                  <div class="token-actions">
                      ${!isEditing ? `
                          <button class="action-btn btn-success set-btn" title="Set as active">✅</button>
                          <button class="action-btn btn-info copy-btn" title="Copy token">📋</button>
                          <button class="action-btn btn-warning edit-btn-main" title="Edit token">📝</button>
                          <button class="action-btn btn-danger del-btn" title="Delete token">🗑️</button>
                      ` : `
                          <div style="font-size: 12px; color: #666;">Editing...</div>
                      `}
                  </div>
              </div>
          `;
      }).join('');
  }

  bindTokenActions() {
      const container = document.getElementById('token-list');
      const mainContent = document.getElementById('mainContent')

      container.addEventListener('click', async (e) => {
          const tokenItem = e.target.closest('.token-item');
          if (!tokenItem) return;

          const index = parseInt(tokenItem.dataset.index);
          const token = this.tokens[index];

          if (e.target.classList.contains('set-btn')) {
              await this.setTokenActive(index);
          } else if (e.target.classList.contains('copy-btn')) {
              await this.copyToken(token.token);
          } else if (e.target.classList.contains('edit-btn-main')) {
              this.startEdit(index);
          } else if (e.target.classList.contains('save-edit-btn')) {
              await this.saveEdit(index);
          } else if (e.target.classList.contains('cancel-edit-btn')) {
              this.cancelEdit(index);
          } else if (e.target.classList.contains('del-btn')) {
            const modalOverlay = document.getElementById('modalOverlay');
            const cancelBtn = document.getElementById('cancelBtn');
            const confirmBtn = document.getElementById('confirmBtn');

            //close modal function
            function closeModal() {
              modalOverlay.style.display = 'none';
              mainContent.classList.remove('blurred');            
            }

            // Open Modal
            modalOverlay.style.display = 'flex';
            mainContent.classList.add('blurred');

            
            cancelBtn.addEventListener('click', () => {
              closeModal();
            })

            confirmBtn.addEventListener('click', async () => {
              await this.deleteToken(index);
              closeModal();
              this.showNotification('Token deleted successfully ✅', 'success')
            })
          } else if (e.target.classList.contains('token-value')) {
              await this.copyToken(token.token);
          }
      });

      // Double-click to edit
      container.addEventListener('dblclick', (e) => {
          const tokenItem = e.target.closest('.token-item');
          if (!tokenItem) return;

          const index = parseInt(tokenItem.dataset.index);
          
          if (e.target.classList.contains('token-desc') || 
              e.target.classList.contains('token-value')) {
              this.startEdit(index);
          }else {
            this.setTokenActive(index); // set the token on double click.
          }
      });

      // Handle Enter/Escape keys in edit mode
      container.addEventListener('keydown', async (e) => {
          if (e.target.classList.contains('edit-input') || 
              e.target.classList.contains('desc-edit-input')) {
              
              const tokenItem = e.target.closest('.token-item');
              const index = parseInt(tokenItem.dataset.index);

              if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  await this.saveEdit(index);
              } else if (e.key === 'Escape') {
                  e.preventDefault();
                  this.cancelEdit(index);
              }
          }
      });
  }

  async setTokenActive(index) {
      this.setLoadingScreen(true);
      // Mark all as inactive
      this.tokens.forEach(t => t.lastUsed = false);
      // Mark selected as active
      this.tokens[index].lastUsed = true;

      await this.saveTokens(this.tokens);
      await this.setTokenInTab(this.tokens[index].token, this.tokens[index].description);
      this.renderTokens();
      this.setLoadingScreen(false)
      this.showNotification(`${this.tokens[index].description} token set successfully ✅`, 'success')
  }

  async copyToken(token) {
      try {
          await navigator.clipboard.writeText(token);
          this.showNotification('Token copied successfully ✅', 'info')
      } catch (error) {
          console.error('Copy failed:', error);
      }
  }

  async deleteToken(index) {
          this.tokens.splice(index, 1);
          await this.saveTokens(this.tokens);
          this.renderTokens();
  }

  startEdit(index) {
      // Cancel any other ongoing edits
      this.tokens.forEach(token => token.isEditing = false);
      
      // Start editing this token
      this.tokens[index].isEditing = true;
      this.renderTokens();

      // Focus on the description input
      setTimeout(() => {
          const tokenItem = document.querySelector(`[data-index="${index}"]`);
          const descInput = tokenItem.querySelector('.desc-edit-input');
          if (descInput) {
              descInput.focus();
              descInput.select();
          }
      }, 10);
  }

  async saveEdit(index) {
      const tokenItem = document.querySelector(`[data-index="${index}"]`);
      const descInput = tokenItem.querySelector('.desc-edit-input');
      const tokenInput = tokenItem.querySelector('.edit-input');

      const newDesc = descInput.value.trim();
      const newToken = tokenInput.value.trim();

      if (!newDesc || !newToken) {
        this.showNotification('Please fill in both description and token', 'danger')
          return;
      }

      // Update the token
      this.tokens[index].description = newDesc;
      this.tokens[index].token = newToken;
      this.tokens[index].isEditing = false;
      this.tokens[index].updatedAt = Date.now();

      await this.saveTokens(this.tokens);
      if(this.tokens[index].lastUsed){
        this.setLoadingScreen(true);
        await this.setTokenInTab(newToken, newDesc);
        this.setLoadingScreen(false);
      }
      this.renderTokens();

      // Show success feedback
      this.showNotification('Token updated successfully!', 'info');
  }

  cancelEdit(index) {
      this.tokens[index].isEditing = false;
      this.renderTokens();
  }

  removeNotificationToast(){
    const existingNotification = document.getElementById('notification')
  
    if(existingNotification){
      notification.parentNode.removeChild(existingNotification);
    }
  }

  showNotification(message, type ) {

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'notification';

    notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 10px 15px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 1000;
        transition: all 0.3s ease;
        pointer-events: none;
        ${colorMap.get(type)}
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 1 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
          }
      }, 300);      
    }, 1000);
}

  // Apply the loading screen or remove it
  setLoadingScreen(apply = true, text = 'Applying'){
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    const innerText = document.getElementById('inner-text');


    if(apply){
      loadingScreen.style.display = 'flex';
      innerText.innerHTML = text
      mainContent.classList.add('blurred')
    }else {
      loadingScreen.style.display = 'none';
      mainContent.classList.remove('blurred')
    }
  }

  clearForm() {
      document.getElementById('token-desc').value = '';
      document.getElementById('token-value').value = '';
  }

  truncateToken(token) {
      return token.length > 50 ? token.substring(0, 50) + '...' : token;
  }

  escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }

  // Storage helpers
  getStoredTokens() {
      return new Promise((resolve) => {
          chrome.storage.local.get(['tokens'], resolve);
      });
  }

  saveTokens(tokens) {
      return new Promise((resolve) => {
          chrome.storage.local.set({ tokens }, resolve);
      });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TokenManager();
});