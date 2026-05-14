// AI Sales Consultant floating chatbot widget
(function() {
  'use strict';

  // Detect initial language
  function getCurrentLang() {
    const htmlLang = document.documentElement.lang || 'en';
    return htmlLang === 'ar' ? 'ar' : 'en';
  }

  function isRTL() {
    return document.documentElement.dir === 'rtl';
  }

  // Translation strings
  const i18n = {
    en: {
      greeting: "Hi! 👋 I'm Dr. Esam's AI Sales Consultant. I can help you create the perfect podcast. What's your goal?",
      placeholder: "Type your message...",
      send: "Send",
      nameLabel: "First Name",
      emailLabel: "Email",
      submit: "Start My Podcast",
      submitting: "Saving...",
      success: "Perfect! We'll be in touch soon! 🎉",
      typing: "Typing..."
    },
    ar: {
      greeting: "مرحبا! 👋 أنا مستشار المبيعات بالذكاء الاصطناعي لدى د. عسام. يمكنني مساعدتك في إنشاء البودكاست المثالي. ما هدفك؟",
      placeholder: "اكتب رسالتك...",
      send: "إرسال",
      nameLabel: "الاسم الأول",
      emailLabel: "البريد الإلكتروني",
      submit: "ابدأ البودكاست الخاص بي",
      submitting: "جاري الحفظ...",
      success: "رائع! سنتواصل معك قريباً! 🎉",
      typing: "جاري الكتابة..."
    }
  };

  class ChatWidget {
    constructor() {
      this.lang = getCurrentLang();
      this.isOpen = false;
      this.isLoading = false;
      this.messages = [];
      this.maxMessages = 20;
      this.selectedService = null;
      this.captureMode = false;
      this.setupLangObserver();
      this.render();
    }

    setupLangObserver() {
      const observer = new MutationObserver(() => {
        const newLang = getCurrentLang();
        if (newLang !== this.lang) {
          this.lang = newLang;
          this.updateUIText();
          if (this.isOpen) {
            this.updatePanelUI();
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang', 'dir']
      });
    }

    getText(key) {
      return i18n[this.lang][key] || i18n.en[key];
    }

    render() {
      // Create container
      const container = document.createElement('div');
      container.id = 'ai-chat-widget';
      container.innerHTML = `
        <style>
          #ai-chat-widget {
            font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
          }

          .chat-fab {
            position: fixed;
            bottom: 24px;
            ${isRTL() ? 'left' : 'right'}: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background-color: var(--color-gold, #c9a84c);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            z-index: 300;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .chat-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
          }

          .chat-fab:active {
            transform: scale(0.95);
          }

          .chat-panel {
            position: fixed;
            bottom: 96px;
            ${isRTL() ? 'left' : 'right'}: 24px;
            width: 420px;
            height: 680px;
            max-height: calc(100vh - 130px);
            background-color: var(--color-surface, #181818);
            border: 1px solid var(--color-border-gold, rgba(201, 168, 76, 0.3));
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            z-index: 301;
            opacity: 0;
            transform: translateY(20px);
            pointer-events: none;
            transition: opacity 0.3s, transform 0.3s;
            overflow: hidden;
          }

          .chat-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            min-height: 0;
            display: flex;
            flex-direction: column;
            scrollbar-width: thin;
            scrollbar-color: rgba(201, 168, 76, 0.3) transparent;
          }

          .chat-content::-webkit-scrollbar {
            width: 6px;
          }

          .chat-content::-webkit-scrollbar-track {
            background: transparent;
          }

          .chat-content::-webkit-scrollbar-thumb {
            background: rgba(201, 168, 76, 0.3);
            border-radius: 3px;
          }

          .chat-content::-webkit-scrollbar-thumb:hover {
            background: rgba(201, 168, 76, 0.5);
          }

          .chat-panel.open {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
          }

          .chat-header {
            padding: 16px;
            border-bottom: 1px solid var(--color-border-gold, rgba(201, 168, 76, 0.3));
            font-weight: 600;
            color: var(--color-text, #f0ede8);
            font-size: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .chat-close-btn {
            background: none;
            border: none;
            color: var(--color-text-secondary, #9a9490);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
          }

          .chat-close-btn:hover {
            color: var(--color-text, #f0ede8);
          }

          .chat-messages {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex-shrink: 0;
          }

          .chat-message {
            display: flex;
            gap: 8px;
            align-items: flex-end;
            margin-bottom: 4px;
          }

          .chat-message.bot {
            justify-content: flex-start;
          }

          .chat-message.user {
            justify-content: flex-end;
          }

          .chat-bubble {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
          }

          .chat-message.bot .chat-bubble {
            background-color: var(--color-bg-alt, #141414);
            color: var(--color-text, #f0ede8);
          }

          .chat-message.user .chat-bubble {
            background-color: var(--color-gold, #c9a84c);
            color: var(--color-bg, #0d0d0d);
          }

          .chat-typing {
            font-size: 14px;
            color: var(--color-text-secondary, #9a9490);
            font-style: italic;
            height: 20px;
            display: flex;
            align-items: center;
          }

          .chat-input-area {
            padding: 0;
            border-top: 1px solid var(--color-border-gold, rgba(201, 168, 76, 0.3));
            display: flex;
            flex-direction: column;
            gap: 0;
            flex-shrink: 0;
          }

          .chat-input-area .chat-input {
            display: flex;
            gap: 8px;
            padding: 10px 14px;
            align-items: flex-end;
          }

          .chat-input-area input {
            flex: 1;
            background-color: var(--color-bg, #0d0d0d);
            border: 1px solid var(--color-border, #2a2a2a);
            border-radius: 6px;
            padding: 8px 10px;
            color: var(--color-text, #f0ede8);
            font-family: inherit;
            font-size: 13px;
            max-height: 80px;
            resize: none;
          }

          .chat-input-area input::placeholder {
            color: var(--color-text-muted, #5c5856);
          }

          .chat-input-area input:focus {
            outline: none;
            border-color: var(--color-gold, #c9a84c);
            box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.1);
          }

          .chat-send-btn {
            background-color: var(--color-gold, #c9a84c);
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: background-color 0.2s;
            flex-shrink: 0;
          }

          .chat-send-btn:hover:not(:disabled) {
            background-color: var(--color-gold-hover, #dfc06a);
          }

          .chat-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .chat-form {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            width: 100%;
          }

          .chat-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 100%;
          }

          .chat-form-group label {
            font-size: 13px;
            color: var(--color-text-secondary, #9a9490);
            font-weight: 500;
          }

          .chat-form-group input {
            background-color: var(--color-bg, #0d0d0d);
            border: 1px solid var(--color-border, #2a2a2a);
            border-radius: 8px;
            padding: 12px 14px;
            color: var(--color-text, #f0ede8);
            font-family: inherit;
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
          }

          .chat-form-group input:focus {
            outline: none;
            border-color: var(--color-gold, #c9a84c);
            box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.1);
          }

          .chat-form-submit {
            background-color: var(--color-gold, #c9a84c);
            border: none;
            border-radius: 8px;
            padding: 14px 16px;
            color: var(--color-bg, #0d0d0d);
            font-weight: 700;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
            margin-top: 4px;
            width: 100%;
            box-sizing: border-box;
          }

          .chat-form-submit:hover:not(:disabled) {
            background-color: var(--color-gold-hover, #dfc06a);
          }

          .chat-form-submit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .chat-success-message {
            color: var(--color-success, #6a9e74);
            text-align: center;
            padding: 20px;
            font-weight: 500;
          }

          .chat-error-message {
            color: #e74c3c;
            text-align: center;
            padding: 20px;
            font-weight: 500;
          }

          .chat-preview {
            display: flex;
            flex-direction: column;
            gap: 0;
            padding: 0;
            flex: 1;
            overflow: hidden;
            min-height: 0;
          }

          .preview-header {
            border-bottom: 1px solid rgba(201, 168, 76, 0.3);
            padding: 12px 16px;
            flex-shrink: 0;
            background-color: rgba(0, 0, 0, 0.2);
          }

          .preview-header h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            color: var(--color-text, #f0ede8);
          }

          .preview-header p {
            margin: 0;
            font-size: 11px;
            color: #999;
          }

          .preview-content {
            flex: 1;
            overflow-y: scroll;
            overflow-x: hidden;
            padding: 12px 16px;
            font-size: 11px;
            line-height: 1.3;
            color: var(--color-text, #f0ede8);
            min-height: 0;
            scrollbar-width: thin;
            scrollbar-color: rgba(201, 168, 76, 0.3) transparent;
          }

          .preview-content::-webkit-scrollbar {
            width: 6px;
          }

          .preview-content::-webkit-scrollbar-track {
            background: transparent;
          }

          .preview-content::-webkit-scrollbar-thumb {
            background: rgba(201, 168, 76, 0.3);
            border-radius: 3px;
          }

          .preview-content::-webkit-scrollbar-thumb:hover {
            background: rgba(201, 168, 76, 0.5);
          }

          .preview-content h1 {
            font-size: 16px !important;
            margin: 8px 0 4px 0 !important;
          }

          .preview-content h2 {
            font-size: 14px !important;
            margin: 4px 0 2px 0 !important;
          }

          .preview-content h3 {
            font-size: 13px !important;
            margin: 4px 0 2px 0 !important;
          }

          .preview-content h4 {
            font-size: 12px !important;
            margin: 3px 0 2px 0 !important;
          }

          .preview-content p {
            margin: 4px 0 !important;
            font-size: 11px !important;
          }

          .preview-content ul {
            margin: 4px 0 !important;
            padding-left: 16px !important;
            font-size: 11px !important;
          }

          .preview-content li {
            margin: 2px 0 !important;
            font-size: 11px !important;
          }

          .preview-content div {
            margin: 4px 0 !important;
          }

          .preview-actions {
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid rgba(201, 168, 76, 0.3);
            flex-shrink: 0;
            background-color: rgba(0, 0, 0, 0.2);
          }

          .preview-btn-send {
            flex: 1;
            background-color: var(--color-gold, #c9a84c);
            border: none;
            border-radius: 6px;
            padding: 12px 16px;
            color: var(--color-bg, #0d0d0d);
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.2s;
          }

          .preview-btn-send:hover {
            background-color: var(--color-gold-hover, #dfc06a);
          }

          .preview-btn-send:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .preview-btn-edit {
            flex: 1;
            background-color: transparent;
            border: 1.5px solid var(--color-gold, #c9a84c);
            border-radius: 6px;
            padding: 12px 16px;
            color: var(--color-gold, #c9a84c);
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
          }

          .preview-btn-edit:hover {
            background-color: rgba(201, 168, 76, 0.1);
          }

          @media (max-width: 480px) {
            .chat-panel {
              width: calc(100% - 48px);
            }
          }
        </style>

        <button class="chat-fab" aria-label="Open chat">💬</button>
        <div class="chat-panel">
          <div class="chat-header">
            <span>Dr. Esam Podcast</span>
            <button class="chat-close-btn" aria-label="Close chat">✕</button>
          </div>
          <div class="chat-content">
            <div class="chat-messages">
              <div class="chat-message bot">
                <div class="chat-bubble"></div>
              </div>
            </div>
            <div class="chat-input-area">
              <input type="text" placeholder="" />
              <button class="chat-send-btn" aria-label="Send message">→</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Get elements
      this.fab = container.querySelector('.chat-fab');
      this.panel = container.querySelector('.chat-panel');
      this.contentArea = container.querySelector('.chat-content');
      this.messagesContainer = container.querySelector('.chat-messages');
      this.input = container.querySelector('.chat-input-area input');
      this.sendBtn = container.querySelector('.chat-send-btn');
      this.closeBtn = container.querySelector('.chat-close-btn');

      // Attach event listeners
      this.fab.addEventListener('click', () => this.toggle());
      this.closeBtn.addEventListener('click', () => this.close());
      this.sendBtn.addEventListener('click', () => this.sendMessage());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Initialize with greeting
      this.addMessage('bot', this.getText('greeting'));
      this.updateUIText();
    }

    toggle() {
      this.isOpen = !this.isOpen;
      this.panel.classList.toggle('open');
      if (this.isOpen) {
        this.input.focus();
      }
    }

    close() {
      this.isOpen = false;
      this.panel.classList.remove('open');
    }

    addMessage(role, content) {
      const message = { role, content };
      this.messages.push(message);

      // Keep only last N messages
      if (this.messages.length > this.maxMessages) {
        this.messages = this.messages.slice(-this.maxMessages);
      }

      this.renderMessages();
    }

    renderMessages() {
      this.messagesContainer.innerHTML = '';

      this.messages.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${msg.role}`;

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = msg.content;

        msgDiv.appendChild(bubble);
        this.messagesContainer.appendChild(msgDiv);
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        this.contentArea.scrollTop = this.contentArea.scrollHeight;
      }, 0);
    }

    async sendMessage() {
      const text = this.input.value.trim();
      if (!text || this.isLoading) return;

      this.input.value = '';
      this.addMessage('user', text);
      this.setLoading(true);

      try {
        // Convert 'bot' role to 'assistant' for Claude API
        const apiMessages = this.messages.map(msg => ({
          role: msg.role === 'bot' ? 'assistant' : msg.role,
          content: msg.content
        }));

        const response = await fetch('/.netlify/functions/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            lang: this.lang
          })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();
        let reply = data.reply;

        // Check for recommendation signal
        const recMatch = reply.match(/<<RECOMMENDATION:(.*?)>>/);
        if (recMatch) {
          try {
            this.discoveryData = JSON.parse(recMatch[1]);
            reply = reply.replace(/<<RECOMMENDATION:.*?>>/, '').trim();
            this.addMessage('bot', reply);
            this.captureMode = true;
            this.showRecommendationForm();
          } catch (err) {
            console.error('Failed to parse recommendation JSON:', err);
            this.addMessage('bot', reply);
          }
        } else {
          this.addMessage('bot', reply);
        }
      } catch (err) {
        console.error('Chat error:', err);
        this.addMessage('bot', 'Sorry, I had trouble responding. Please try again.');
      } finally {
        this.setLoading(false);
      }
    }

    setLoading(loading) {
      this.isLoading = loading;
      this.sendBtn.disabled = loading;
      this.input.disabled = loading;
      this.input.placeholder = loading ? this.getText('typing') : this.getText('placeholder');
    }

    showRecommendationForm() {
      // Replace input area with form
      const inputArea = this.panel.querySelector('.chat-input-area');
      inputArea.innerHTML = `
        <div class="chat-form">
          <div class="chat-form-group">
            <label>${this.getText('nameLabel')}</label>
            <input type="text" id="chat-name" placeholder="First name" required />
          </div>
          <div class="chat-form-group">
            <label>Last Name (optional)</label>
            <input type="text" id="chat-lastname" placeholder="Last name" />
          </div>
          <div class="chat-form-group">
            <label>${this.getText('emailLabel')}</label>
            <input type="email" id="chat-email" placeholder="your@email.com" required />
          </div>
          <button class="chat-form-submit" id="chat-form-submit">📊 Get My Recommendation</button>
        </div>
      `;

      const submitBtn = document.getElementById('chat-form-submit');
      submitBtn.addEventListener('click', () => this.generateAndPreviewRecommendation());
    }

    async generateAndPreviewRecommendation() {
      const nameInput = document.getElementById('chat-name');
      const lastNameInput = document.getElementById('chat-lastname');
      const emailInput = document.getElementById('chat-email');

      if (!nameInput.value.trim() || !emailInput.value.trim()) {
        alert('Please fill in name and email');
        return;
      }

      const submitBtn = document.querySelector('.chat-form-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = this.getText('submitting');

      try {
        // First, generate the recommendation and get preview
        const response = await fetch('/.netlify/functions/generate-recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discoveryData: this.discoveryData,
            firstName: nameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            email: emailInput.value.trim(),
            previewOnly: true // Request preview, don't send email yet
          })
        });

        if (!response.ok) throw new Error('Failed to generate recommendation');

        const result = await response.json();

        // Show preview with approve/edit buttons
        this.showEmailPreview(result, nameInput.value.trim(), lastNameInput.value.trim(), emailInput.value.trim());

      } catch (err) {
        console.error('Recommendation generation error:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = '📊 Get My Recommendation';
        this.addMessage('bot', 'Sorry, there was an error. Please try again or contact us at dresampodcast.com');
      }
    }

    showEmailPreview(recommendation, firstName, lastName, email) {
      const inputArea = this.panel.querySelector('.chat-input-area');
      inputArea.innerHTML = `
        <div class="chat-preview">
          <div class="preview-header">
            <h4>📧 Email Preview</h4>
            <p style="font-size: 11px; color: #999;">Review before sending to ${email}</p>
          </div>
          <div class="preview-content">${recommendation.emailHtml}</div>
          <div class="preview-actions">
            <button id="preview-send" class="preview-btn-send">✓ Send Email</button>
            <button id="preview-edit" class="preview-btn-edit">✎ Edit</button>
          </div>
        </div>
      `;

      document.getElementById('preview-send').addEventListener('click', () =>
        this.confirmAndSendRecommendation(recommendation, firstName, lastName, email)
      );

      document.getElementById('preview-edit').addEventListener('click', () =>
        this.showRecommendationForm()
      );
    }

    async confirmAndSendRecommendation(recommendation, firstName, lastName, email) {
      const inputArea = this.panel.querySelector('.chat-input-area');
      inputArea.innerHTML = `<div style="text-align: center; padding: 20px;"><p>${this.getText('submitting')}</p></div>`;

      try {
        const response = await fetch('/.netlify/functions/generate-recommendation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discoveryData: this.discoveryData,
            firstName,
            lastName,
            email,
            previewOnly: false // Actually send the email
          })
        });

        if (!response.ok) throw new Error('Failed to send recommendation');

        // Show success message
        inputArea.innerHTML = `
          <div class="chat-success-message">
            <p>✅ Your recommendation has been sent!</p>
            <p style="font-size: 12px; margin-top: 8px;">Check your email for the full details, pricing, and next steps.</p>
          </div>
        `;

        this.addMessage('bot', '🎉 Your personalized podcast recommendation has been sent to your email! Check your inbox for pricing, packages, and next steps.');
      } catch (err) {
        console.error('Email send error:', err);
        inputArea.innerHTML = `
          <div class="chat-error-message">
            <p>❌ Error sending email</p>
            <p style="font-size: 12px; margin-top: 8px;">Please contact us at dresampodcast.com</p>
          </div>
        `;
      }
    }


    updateUIText() {
      const panelHeader = this.panel.querySelector('.chat-header');
      panelHeader.textContent = this.lang === 'ar' ? 'بودكاست د. عسام' : 'Dr. Esam Podcast';

      const input = this.panel.querySelector('.chat-input-area input');
      if (input) {
        input.placeholder = this.getText('placeholder');
      }

      const sendBtn = this.panel.querySelector('.chat-send-btn');
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.textContent = this.getText('send');
      }

      // Update panel direction
      this.panel.style.direction = isRTL() ? 'rtl' : 'ltr';
    }

    updatePanelUI() {
      this.updateUIText();
      // Adjust position based on RTL
      if (isRTL()) {
        this.panel.style.right = 'auto';
        this.panel.style.left = '24px';
      } else {
        this.panel.style.left = 'auto';
        this.panel.style.right = '24px';
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ChatWidget());
  } else {
    new ChatWidget();
  }
})();
