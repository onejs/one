#pragma once

// worklets names its queue thread with the one argument Apple form of
// pthread_setname_np; glibc takes the thread first
#include <pthread.h>

#define pthread_setname_np(name) pthread_setname_np(pthread_self(), (name))
