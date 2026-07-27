async function test() {
    try {
        const res = await fetch('http://localhost:4004/odata/v4/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'planner1', passwordHash: 'planner123' })
        });
        console.log('STATUS:', res.status);
        console.log('JSON:', await res.json());
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
test();
