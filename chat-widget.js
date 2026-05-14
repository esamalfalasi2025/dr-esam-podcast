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
            width: 400px;
            max-height: 550px;
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
          }

          .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
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
            padding: 12px 16px;
            border-top: 1px solid var(--color-border-gold, rgba(201, 168, 76, 0.3));
            display: flex;
            gap: 8px;
          }

          .chat-input-area input {
            flex: 1;
            background-color: var(--color-bg, #0d0d0d);
            border: 1px solid var(--color-border, #2a2a2a);
            border-radius: 8px;
            padding: 10px 12px;
            color: var(--color-text, #f0ede8);
            font-family: inherit;
            font-size: 14px;
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
            border-radius: 8px;
            padding: 10px 14px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.2s;
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
            gap: 12px;
          }

          .chat-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
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
            padding: 10px 12px;
            color: var(--color-text, #f0ede8);
            font-family: inherit;
            font-size: 14px;
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
            padding: 12px 16px;
            color: var(--color-bg, #0d0d0d);
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
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

          @media (max-width: 480px) {
            .chat-panel {
              width: calc(100% - 48px);
            }
          }
        </style>

        <button class="chat-fab" aria-label="Open chat">💬</button>
        <div class="chat-panel">
          <div class="chat-header">Dr. Esam Podcast</div>
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
      `;

      document.body.appendChild(container);

      // Get elements
      this.fab = container.querySelector('.chat-fab');
      this.panel = container.querySelector('.chat-panel');
      this.messagesContainer = container.querySelector('.chat-messages');
      this.input = container.querySelector('.chat-input-area input');
      this.sendBtn = container.querySelector('.chat-send-btn');

      // Attach event listeners
      this.fab.addEventListener('click', () => this.toggle());
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
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }, 0);
    }

    async sendMessage() {
      const text = this.input.value.trim();
      if (!text || this.isLoading) return;

      this.input.value = '';
      this.addMessage('user', text);
      this.setLoading(true);

      try {
        const response = await fetch('/.netlify/functions/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: this.messages,
            lang: this.lang
          })
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();
        let reply = data.reply;

        // Check for lead capture signal
        if (reply.includes('<<LEAD_CAPTURE>>')) {
          reply = reply.replace('<<LEAD_CAPTURE>>', '').trim();
          this.addMessage('bot', reply);
          this.captureMode = true;
          this.showLeadForm();
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

    showLeadForm() {
      // Replace input area with form
      const inputArea = this.panel.querySelector('.chat-input-area');
      inputArea.innerHTML = `
        <div class="chat-form">
          <div class="chat-form-group">
            <label>${this.getText('nameLabel')}</label>
            <input type="text" id="chat-name" required />
          </div>
          <div class="chat-form-group">
            <label>${this.getText('emailLabel')}</label>
            <input type="email" id="chat-email" required />
          </div>
          <button class="chat-form-submit" id="chat-form-submit">${this.getText('submit')}</button>
        </div>
      `;

      const submitBtn = document.getElementById('chat-form-submit');
      submitBtn.addEventListener('click', () => this.submitLead());
    }

    async submitLead() {
      const nameInput = document.getElementById('chat-name');
      const emailInput = document.getElementById('chat-email');

      if (!nameInput.value.trim() || !emailInput.value.trim()) {
        alert('Please fill in all fields');
        return;
      }

      const submitBtn = document.querySelector('.chat-form-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = this.getText('submitting');

      try {
        const [firstName, ...lastNameParts] = nameInput.value.trim().split(' ');
        const lastName = lastNameParts.join(' ');

        const response = await fetch('/.netlify/functions/chat-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: emailInput.value.trim(),
            service_name: 'AI Podcast Consultation',
            service_key: 'ai-podcast-consultation'
          })
        });

        if (!response.ok) throw new Error('Failed to save lead');

        // Show success message
        const inputArea = this.panel.querySelector('.chat-input-area');
        if (!inputArea.querySelector('.chat-form')) {
          inputArea.innerHTML = '';
        } else {
          inputArea.querySelector('.chat-form').innerHTML = `<div class="chat-success-message">${this.getText('success')}</div>`;
        }

        this.addMessage('bot', 'Your information has been saved. We\'ll get in touch shortly!');
      } catch (err) {
        console.error('Lead capture error:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = this.getText('submit');
        alert('Error saving information. Please try again.');
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
