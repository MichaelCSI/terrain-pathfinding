// Priority queue (binary heap)
export class MinHeap<T> {
    private data: { priority: number; item: T }[] = [];
    
    push(item: T, priority: number) {
        this.data.push({ priority, item });
        this.bubbleUp();
    }

    pop(): T | undefined {
        if (this.data.length === 0) return undefined;
        const min = this.data[0].item;
        const end = this.data.pop()!;
        if (this.data.length > 0) {
            this.data[0] = end;
            this.bubbleDown();
        }
        return min;
    }

    isEmpty() {
        return this.data.length === 0;
    }

    private bubbleUp() {
        let idx = this.data.length - 1;
        const element = this.data[idx];
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            const parent = this.data[parentIdx];
            if (element.priority >= parent.priority) break;
            this.data[idx] = parent;
            this.data[parentIdx] = element;
            idx = parentIdx;
        }
    }
    
    private bubbleDown() {
        let idx = 0;
        const length = this.data.length;
        const element = this.data[0];
        while (true) {
            let leftIdx = 2 * idx + 1;
            let rightIdx = 2 * idx + 2;
            let swapIdx = -1;

            if (leftIdx < length && this.data[leftIdx].priority < element.priority) {
                swapIdx = leftIdx;
            }
            if (
                rightIdx < length &&
                this.data[rightIdx].priority <
                (swapIdx === -1 ? element.priority : this.data[leftIdx].priority)
            ) {
                swapIdx = rightIdx;
            }
            if (swapIdx === -1) break;
            this.data[idx] = this.data[swapIdx];
            this.data[swapIdx] = element;
            idx = swapIdx;
        }
    }
}