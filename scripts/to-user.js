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
					throw new Error(`HTTP error! Status: ${r.status}`);
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
			if (user) {
				callback(user, sessionId);
			}
		});
	});
};


function setSessionId() {
	const urlParams = new URLSearchParams(window.location.search);
	const sessionId = urlParams.get('session');

	if (sessionId) {
		sessionStorage.setItem('sessionid', sessionId);
	}
}
