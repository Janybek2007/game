function toCases(callback) {
	toUser((user, headers) => {
		fetch('https://jackhanmacsgolkgame.pythonanywhere.com/cases', {
			method: 'GET',
			credentials: 'include',
			headers: {
				...headers,
				'Content-Type': 'application/json'
			}
		})
			.then(r => {
				if (!r.ok) {
					throw new Error(`HTTP error! Status: ${r.status}`);
				}
				return r.json();
			})
			.then(cases => callback(cases))
			.catch(error => {
				console.error('Error fetching user data:', error);
				callback(null);
			});
	});
}
