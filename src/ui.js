export function showWelcomeScreen() {
     if (welcomeScreenElement) {
         const welcomeImage = welcomeScreenElement.querySelector('img');
         if (welcomeImage && isMobileDevice()) {
             welcomeImage.src = '/mobileUI.png';
         } else {
            welcomeImage.src = '/Welcome UI PC.png';
         }
         welcomeScreenElement.style.opacity = '1';
         welcomeScreenElement.style.display = 'flex';
     }
}