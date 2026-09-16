# Restaurant Order System v1

This is a simple working prototype for:
- Waiter: select table, add food, send order
- Kitchen: see orders and update NEW -> PREPARING -> READY -> SERVED
- Billing: see unpaid orders and mark Cash/UPI/Card
- Table becomes available after payment

## Run on your Mac
Open Terminal in this folder and run:

python3 server.py

Then open:
http://localhost:8000

## Phone on the same Wi-Fi
On the restaurant computer, find its IP:
ipconfig getifaddr en0

Then on the phone, connected to the same Wi-Fi, open:
http://YOUR-IP:8000

Example:
http://192.168.1.5:8000

Keep Terminal running while using the system.


## Version 2 changes
- Mobile-friendly menu category buttons.
- Categories currently include Arabian & Mandi, Biryani, and Breads.
- Waiter can select an already occupied table and send another order; this acts as an additional order for that table.
- Clear Order button added.


## Fix
Category buttons were fixed to use reliable click listeners for mobile browsers.
