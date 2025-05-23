// public/js/navbar.js
async function updateNavbar() {
    try {
        const res = await fetch('/session-info');
        const data = await res.json();
        const userArea = document.querySelector('.user-area');

        if (!userArea) return;

        if (data.loggedIn) {
            userArea.innerHTML = `
                <span style="margin-right: 10px;">👤 ${data.user.username}</span>
                <a href="/profile.html" class="btn">Profilim</a>
                <a href="/logout" class="btn">Çıkış Yap</a>
            `;
        } else {
            userArea.innerHTML = `<a href="/login.html" class="btn">Giriş Yap</a>`;
        }
    } catch (err) {
        console.error("Navbar güncellenemedi:", err);
    }
}

window.addEventListener('DOMContentLoaded', updateNavbar);
