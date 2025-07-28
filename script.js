import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getDatabase, ref, set, push, remove, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyArVK4JdqGYYMk2rlOLcwenCBzJIWOVYg8",
    authDomain: "igacoslr.firebaseapp.com",
    projectId: "igacoslr",
    storageBucket: "igacoslr.appspot.com",
    messagingSenderId: "168499425895",
    appId: "1:168499425895:web:1e32d9d1c8f52887f0dac2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const ADMIN_UID = 'ei66KvfdRjakTEycf2acPG3EQo73';

class LrPortalApp extends LitElement {
  
  // Properties: Lit automatically re-renders the component when these change.
  static properties = {
    allMaterials: { type: Array },
    view: { type: String },
    isAdmin: { type: Boolean },
    user: { type: Object },
    searchTerm: { type: String },
  };

  constructor() {
    super();
    this.allMaterials = [];
    this.isAdmin = false;
    this.user = null;
    this.searchTerm = '';
    // Check session storage for student access
    const studentAccess = sessionStorage.getItem('studentAccessGranted') === 'true';
    this.view = studentAccess ? 'materials' : 'landing';
  }

  // This runs when the component is added to the page
  connectedCallback() {
    super.connectedCallback();
    this.setupFirebaseListeners();
  }

  setupFirebaseListeners() {
    // Listen for authentication changes
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      this.isAdmin = user && user.uid === ADMIN_UID;
      if (this.isAdmin) {
        sessionStorage.removeItem('studentAccessGranted');
        this.view = 'materials';
      }
    });

    // Listen for changes to educational materials
    const materialsRef = ref(db, 'educationalMaterials');
    onValue(materialsRef, (snapshot) => {
      const data = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          data.push({ id: child.key, ...child.val() });
        });
      }
      this.allMaterials = data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    });
  }
  
  handleStudentLogin(e) {
    e.preventDefault();
    const input = this.shadowRoot.getElementById('accessCodeInput');
    // NOTE: This is a simplified check. For production, you'd fetch codes.
    if (input.value) { // This example just checks if a code was entered.
        sessionStorage.setItem('studentAccessGranted', 'true');
        this.view = 'materials';
    } else {
        alert('Please enter an access code.');
    }
  }

  handleAdminLogin(e) {
    e.preventDefault();
    const email = this.shadowRoot.getElementById('adminLoginEmail').value;
    const password = this.shadowRoot.getElementById('adminLoginPassword').value;
    signInWithEmailAndPassword(auth, email, password).catch(err => alert(err.message));
  }
  
  handleLogout() {
    if(this.isAdmin) {
        signOut(auth);
    }
    sessionStorage.removeItem('studentAccessGranted');
    this.view = 'landing';
    this.isAdmin = false;
    this.user = null;
  }
  
  handleAddLink(e) {
      e.preventDefault();
      const form = e.target;
      const description = form.linkDescription.value;
      const gradeLevel = form.gradeLevel.value;
      const link = form.fileLink.value;

      if (!description || !gradeLevel || !link) {
          alert('All fields are required.');
          return;
      }

      const newMaterialRef = push(ref(db, 'educationalMaterials'));
      set(newMaterialRef, {
          description,
          gradeLevel,
          link,
          createdAt: serverTimestamp(),
          addedBy: this.user.uid
      }).then(() => {
          form.reset();
      }).catch(err => alert(err.message));
  }
  
  handleDeleteLink(materialId) {
      if(confirm('Are you sure you want to delete this link?')) {
          remove(ref(db, `educationalMaterials/${materialId}`));
      }
  }

  // Main render method: determines what to show based on the 'view'
  render() {
    const showHeader = this.view !== 'landing' || this.isAdmin;
    
    return html`
      ${showHeader ? this.renderHeader() : ''}
      <main>
        ${this.view === 'landing' ? this.renderLanding() : ''}
        ${this.view === 'student-login' ? this.renderStudentLogin() : ''}
        ${this.view === 'admin-login' ? this.renderAdminLogin() : ''}
        ${this.view === 'materials' ? this.renderMaterialsPage() : ''}
      </main>
      <footer class="footer">
        <p>© ${new Date().getFullYear()} IGACOS LR PORTAL. All Rights Reserved.</p>
      </footer>
    `;
  }
  
  renderHeader() {
      return html`
        <header class="header">
            <div class="logo">IGACOS <span>LR PORTAL</span></div>
            <div class="header-controls">
                ${this.isAdmin && this.user ? html`<div class="user-id-display">Logged in as: <span>${this.user.email}</span></div>` : ''}
                <button @click=${this.handleLogout} class="logout-btn">Logout</button>
            </div>
        </header>
      `;
  }

  renderLanding() {
    return html`
      <section class="content-section landing-page">
        <h1>IGACOS LR PORTAL</h1>
        <p>Division of the Island Garden City of Samal - The Division of Fulfilment</p>
        <div class="landing-actions">
            <button id="landingStudentBtn" @click=${() => { this.view = 'student-login' }}>Login as Student</button>
            <button id="landingAdminBtn" @click=${() => { this.view = 'admin-login' }}>Login as Admin</button>
        </div>
      </section>
    `;
  }
  
  renderStudentLogin() {
    return html`
        <section class="content-section auth-section">
            <h2>Student Access</h2>
            <form class="auth-form" @submit=${this.handleStudentLogin}>
                <input type="password" id="accessCodeInput" class="form-input" placeholder="Enter Site Access Code" required />
                <button type="submit" class="form-button">Unlock Content</button>
            </form>
        </section>
    `;
  }

  renderAdminLogin() {
    return html`
        <section class="content-section auth-section">
            <h2>Admin Login</h2>
            <form class="auth-form" @submit=${this.handleAdminLogin}>
                <input type="email" id="adminLoginEmail" class="form-input" placeholder="Email" required />
                <input type="password" id="adminLoginPassword" class="form-input" placeholder="Password" required />
                <button type="submit" class="form-button">Login as Admin</button>
            </form>
        </section>
    `;
  }

  renderMaterialsPage() {
    const filteredMaterials = this.allMaterials.filter(mat => 
        mat.description.toLowerCase().includes(this.searchTerm.toLowerCase())
    );

    return html`
        ${this.isAdmin ? this.renderAdminPanel() : ''}
        <section class="content-section">
            <h2>Learning Resources</h2>
            <div class="search-container">
                <input 
                    type="text" 
                    .value=${this.searchTerm}
                    @input=${(e) => { this.searchTerm = e.target.value }}
                    placeholder="Search for resources..." />
            </div>
            <div class="materials-grid">
                ${filteredMaterials.length > 0
                    ? filteredMaterials.map(mat => this.renderMaterialCard(mat))
                    : html`<p>No materials found.</p>`
                }
            </div>
        </section>
    `;
  }
  
  renderMaterialCard(mat) {
    return html`
        <div class="material-card">
            <a href="${mat.link}" target="_blank">${mat.description}</a>
            <div class="card-footer">
                <span class="grade-badge">Grade ${mat.gradeLevel.replace('grade', '')}</span>
                ${this.isAdmin 
                    ? html`<button @click=${() => this.handleDeleteLink(mat.id)} class="delete-link-btn" title="Delete Material">
                                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                            </button>` 
                    : ''
                }
            </div>
        </div>
    `;
  }
  
  renderAdminPanel() {
      return html`
        <section class="content-section">
            <h2>Admin Dashboard</h2>
            <div class="admin-panel-grid">
                <div class="admin-form-section">
                    <h3>Add New Educational Material</h3>
                    <form @submit=${this.handleAddLink}>
                        <input name="fileLink" type="text" class="form-input" placeholder="Paste Download Link Here" required />
                        <input name="linkDescription" type="text" class="form-input" placeholder="Description (e.g., 'Math Worksheet')" required />
                        <select name="gradeLevel" class="form-input" required>
                            <option value="">Select Grade Level</option>
                            <option value="grade1">Grade 1</option><option value="grade2">Grade 2</option><option value="grade3">Grade 3</option>
                            <option value="grade4">Grade 4</option><option value="grade5">Grade 5</option><option value="grade6">Grade 6</option>
                            <option value="grade7">Grade 7</option><option value="grade8">Grade 8</option><option value="grade9">Grade 9</option>
                            <option value="grade10">Grade 10</option><option value="grade11">Grade 11</option><option value="grade12">Grade 12</option>
                        </select>
                        <button type="submit" class="form-button">Add Link</button>
                    </form>
                </div>
            </div>
        </section>
      `;
  }

  // Connects the component's styles with the DOM
  static styles = css`
    :host {
      display: block;
    }
    /* Add any component-specific styles here if needed */
  `;
}

customElements.define('lr-portal-app', LrPortalApp);