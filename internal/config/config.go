package config

import (
	"os"
	"strconv"
)

// Config holds application configuration
type Config struct {
	ServerHost         string
	ServerPort         string
	MongoURI           string
	MongoDB            string
	MongoEventsColl    string
	MongoSnapshotsColl string
	RedisAddr          string
	RedisDB            int
	LogLevel           string
	LogFormat          string
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() Config {
	return Config{
		ServerHost:         getEnv("SERVER_HOST", "0.0.0.0"),
		ServerPort:         getEnv("SERVER_PORT", "8080"),
		MongoURI:           getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:            getEnv("MONGO_DB", "golem_game"),
		MongoEventsColl:    getEnv("MONGO_EVENTS_COLL", "game_events"),
		MongoSnapshotsColl: getEnv("MONGO_SNAPSHOTS_COLL", "game_snapshots"),
		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		RedisDB:            getEnvInt("REDIS_DB", 0),
		LogLevel:           getEnv("LOG_LEVEL", "info"),
		LogFormat:          getEnv("LOG_FORMAT", "json"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
