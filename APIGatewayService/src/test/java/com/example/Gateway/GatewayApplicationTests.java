package com.example.Gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "KEYCLOAK_URL=http://localhost:8080")
class GatewayApplicationTests {

	@Test
	void contextLoads() {
	}

}
