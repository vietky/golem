package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds the application configuration
type Config struct {
	// Server configuration
	ServerHost string
	ServerPort int

	// MongoDB configuration
	MongoURI      string
	MongoDB       string
	MongoUser     string
	MongoPassword string

	// Redis configuration
	RedisAddr     string
	RedisPassword string
	RedisDB       int

	// Game configuration
	MaxPlayers        int
	CaravanCapacity   int
	PointCardsToWin   int
	CopperTokenPoints int
	SilverTokenPoints int

	// JWT configuration
	JWTSecret            string
	JWTEnabled           bool
	SessionTokenLifetime int // in seconds

	// Logging
	LogLevel  string
	LogFormat string // "json" or "text"
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	config := &Config{
		ServerHost:           getEnv("SERVER_HOST", "0.0.0.0"),
		ServerPort:           getEnvAsInt("SERVER_PORT", 8080),
		MongoURI:             getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:              getEnv("MONGO_DB", "golem_game"),
		MongoUser:            getEnv("MONGO_USER", ""),
		MongoPassword:        getEnv("MONGO_PASSWORD", ""),
		RedisAddr:            getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:        getEnv("REDIS_PASSWORD", ""),
		RedisDB:              getEnvAsInt("REDIS_DB", 0),
		MaxPlayers:           getEnvAsInt("MAX_PLAYERS", 5),
		CaravanCapacity:      getEnvAsInt("CARAVAN_CAPACITY", 10),
		PointCardsToWin:      getEnvAsInt("POINT_CARDS_TO_WIN", 5),
		CopperTokenPoints:    getEnvAsInt("COPPER_TOKEN_POINTS", 3),
		SilverTokenPoints:    getEnvAsInt("SILVER_TOKEN_POINTS", 1),
		JWTSecret:            getEnv("JWT_SECRET", ""),
		JWTEnabled:           getEnvAsBool("JWT_ENABLED", false),
		SessionTokenLifetime: getEnvAsInt("SESSION_TOKEN_LIFETIME", 3600),
		LogLevel:             getEnv("LOG_LEVEL", "info"),
		LogFormat:            getEnv("LOG_FORMAT", "text"),
	}

	// Build MongoDB URI with credentials if provided
	if config.MongoUser != "" && config.MongoPassword != "" {
		config.MongoURI = fmt.Sprintf("mongodb://%s:%s@%s",
			config.MongoUser, config.MongoPassword,
			config.MongoURI[len("mongodb://"):])
	}

	return config, nil
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as an integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}

// getEnvAsBool gets an environment variable as a boolean or returns a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.ParseBool(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}
