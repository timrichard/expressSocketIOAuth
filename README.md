ExpressJS baseline to link up authentication between ExpressJS and Socket.IO
Intend to build further projects upon this baseline. 

Passport is used for authentication with the Local strategy.
I handle user account crypto using Node's library supplied PBKDF2 scheme. 
I've also implemented logic to allow dynamic re-hashing of the password/salt if the system defaults for HashIterations and HashKeyLength are increased.
TODO : Migrate these defaults to environment variables.

TDD Unit Tests are through NodeUnit. Mocks are implemented through a Dependency Injection library called Rewire.

The CasperJS integration/end to end tests include WebSocket testing following some guidance from the CasperJS author, Nicolas Perriault.
