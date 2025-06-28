let toAuthorization = callback => {
	const storedSessionId = sessionStorage.getItem('sessionid');

	if (storedSessionId) {
		fetch('https://jackhanmacsgolkgame.pythonanywhere.com/user', {
			method: 'GET',
			credentials: 'include',
			headers: {
				Authorization: `Session ${storedSessionId}`,
				'Content-Type': 'application/json'
			}
		})
			.then(r => {
				if (!r.ok) {
					return null;
				}
				return r.json();
			})
			.then(user =>
				callback(user, { Authorization: `Session ${storedSessionId}` })
			)
			.catch(error => {
				console.error('Error fetching user data:', error);
				callback(null);
			});
	} else {
		console.log('No session ID found');
		callback(null);
	}
};

let toUser = callback => {
	document.addEventListener('DOMContentLoaded', () => {
		setSessionId();
		toAuthorization((user, sessionId) => {
			callback(user, sessionId);
		});
	});
};

function getCaseId() {
	const urlParams = new URLSearchParams(window.location.search);
	return Number(urlParams.get('id'));
}

function setSessionId() {
	const urlParams = new URLSearchParams(window.location.search);
	const sessionId = urlParams.get('session');

	if (sessionId) {
		sessionStorage.setItem('sessionid', sessionId);
	}
}

function toUserProfileUI(user) {
	if (user) {
		const layer1 = document.querySelector('.layer1');
		if (layer1) {
			layer1.style.display = 'none';
		}

		const userProfile = document.getElementById('user-profile');
		userProfile.classList.remove('user-profile-hidden');

		const userData = Array.isArray(user) ? user[0] : user;

		document.getElementById('user-avatar').src = userData.avatar_url || '';
		document.getElementById('user-nickname').textContent =
			userData.nickname || 'User';
		document.getElementById('user-balance').textContent = userData.balance
			? `${userData.balance}₽`
			: '0.00₽';

		// Обновляем кейсы, делая их кликабельными
		const caseElements = document.querySelectorAll('.cases');
		caseElements.forEach(caseElement => {
			// Удаляем оверлей, если он есть
			const overlay = caseElement.querySelector('.case-overlay');
			if (overlay) {
				caseElement.removeChild(overlay);
			}

			// Делаем кейс кликабельным
			const caseWrapper = caseElement.querySelector('.case-wrapper');
			if (caseWrapper) {
				const caseId = caseElement.getAttribute('data-case-id');
				if (caseId) {
					const caseLink = document.createElement('a');
					caseLink.href = `case.html?id=${caseId}`;
					caseLink.style.textDecoration = 'none';

					// Перемещаем содержимое caseWrapper в caseLink
					while (caseWrapper.firstChild) {
						caseLink.appendChild(caseWrapper.firstChild);
					}

					caseElement.replaceChild(caseLink, caseWrapper);
				}
			}
		});
	}
}
