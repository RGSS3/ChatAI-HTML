document.addEventListener('DOMContentLoaded', function() {
    loadState();
    initializeUI();
    initializeVariables();
    AITerm.initState();
    const keys = localStorage.getItem('keys');
    if (keys) {
        try {
            const content = JSON.parse(keys);
            KeyHub.setContent(content);
        } catch (e) {
            
        }
    }
    KeyHub.setOnUpdate(
        () => localStorage.setItem('keys', JSON.stringify(KeyHub.keys))
    )
    

// 添加到 HTML

        // 如果url后面有?code=.... 那就是OpenRouter获取的新Key, 把他填入Bearer
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            fetch("https://openrouter.ai/api/v1/auth/keys", {
                method: "POST",
                body: JSON.stringify({
                    code: code,
                })
            }).then(response => response.json()).then(data => {
                console.log(data);
                state.bearer = data.key;
                document.getElementById("bearer-input").value = state.bearer;
                window.history.replaceState({}, document.title, window.location.pathname);
                saveState();
            })
        }


       
})