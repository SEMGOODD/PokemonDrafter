package com.example.Gateway.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
		@NotBlank String nom,
		@NotBlank String prenom,
		@NotBlank @Email String mail,
		@NotBlank @Size(min = 3, max = 30) String pseudo,
		@NotBlank @Size(min = 8) String password,
		@NotBlank @Pattern(regexp = "red|blue") String couleur
) {
}
