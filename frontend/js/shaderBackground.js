(function() {
    const canvas = document.getElementById('shader-background');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let time = 0;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    function draw() {
        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0a0514'); // Very dark purple/black
        gradient.addColorStop(1, '#130524');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw glowing purple waves
        ctx.globalCompositeOperation = 'lighter';
        
        const lines = 8;
        for (let i = 0; i < lines; i++) {
            ctx.beginPath();
            
            // Adjust phase and amplitude per line
            const phase = time * 0.001 + i * 0.5;
            const amplitude = 60 + i * 20;
            const offset = (height / 2) + Math.sin(time * 0.0005 + i) * 120;

            for (let x = 0; x <= width; x += 15) {
                // Combine multiple sine waves for organic fluid wave feel
                const y = offset 
                        + Math.sin(x * 0.003 + phase) * amplitude
                        + Math.sin(x * 0.007 - phase * 0.8) * (amplitude * 0.5)
                        + Math.cos(x * 0.01 + phase) * (amplitude * 0.2);
                
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            // Glowing effect parameters - bright purple/neon
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.1 + (i / lines) * 0.4})`;
            ctx.lineWidth = 1 + (i * 0.5);
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#a855f7';
            ctx.stroke();
        }
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;

        time += 20; // animation speed
        requestAnimationFrame(draw);
    }

    draw();
})();
