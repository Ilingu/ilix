dev:
	 cargo watch -x run

docker_build:
	docker build -t ilix-service .

docker_start: docker_build
	docker run -d -p 3000:3000 ilix-service:latest