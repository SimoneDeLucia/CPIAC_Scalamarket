FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./microservices/inventory_service .

ENV FLASK_APP=app:create_app
CMD ["flask", "run", "--host=0.0.0.0", "--port=5002"]
